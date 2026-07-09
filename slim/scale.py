"""
Xiaomi Body Composition Scale 2 BLE reader
Model: XMTZC05HM (MIBFS)

Verified: weight in last 2 bytes, LE, 0.005 kg/unit.
Waits for stable reading before returning final weight.
"""
import asyncio, time
from bleak import BleakScanner

UUID_BCS = "0000181b-0000-1000-8000-00805f9b34fb"
SCALE_NAMES = ["MIBFS", "MI SCALE", "MI_BFS"]

class ScaleReader:
    def __init__(self):
        self._readings = []  # (timestamp, weight)

    @staticmethod
    def _parse(data):
        if len(data) < 10:
            return None
        raw = (data[-1] << 8) | data[-2]
        w = raw * 0.005
        if 20 < w < 250:
            return round(w, 1)
        return None

    async def wait_for_reading(self, timeout=60.0):
        """Collect readings until the scale stabilizes, return the final weight."""
        self._readings = []

        def callback(device, ad_data):
            name = (device.name or "").upper()
            if not any(n in name for n in SCALE_NAMES):
                uuids = [str(u) for u in (ad_data.service_uuids or [])]
                if UUID_BCS not in uuids:
                    return
            data = ad_data.service_data.get(UUID_BCS)
            if data:
                w = self._parse(data)
                if w:
                    self._readings.append((time.time(), w))

        async with BleakScanner(callback) as scanner:
            deadline = time.time() + timeout
            last_seen = 0
            while time.time() < deadline:
                await asyncio.sleep(0.5)
                if self._readings:
                    last_seen = time.time()
                # If we have readings and no new ones for 4 seconds, it's stable
                if self._readings and time.time() - last_seen > 2.5:
                    break

        if not self._readings:
            return None

        # Take the median of the last 5 readings (most stable)
        recent = self._readings[-5:]
        weights = sorted(r[1] for r in recent)
        median = weights[len(weights) // 2]
        return median
