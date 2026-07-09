/**
 * SlimBuddy IndexedDB — 纯前端数据库，替代 SQLite
 * 所有函数返回 Promise，API 与 slim/database.py 一致
 */
const DB = (() => {
  const DB_NAME = 'slimbuddy';
  const DB_VERSION = 1;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('user_profile')) {
          const store = db.createObjectStore('user_profile', { keyPath: 'id' });
          store.put({ id: 1, name: 'BingLi', height_cm: 171, age: 22, start_weight_kg: 100.5,
            allergies: '', conditions: '', medications: '', activity_level: 'light',
            created_at: new Date().toISOString() });
        }
        if (!db.objectStoreNames.contains('weight_records')) {
          db.createObjectStore('weight_records', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('weekly_schedule')) {
          db.createObjectStore('weekly_schedule', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('daily_plans')) {
          db.createObjectStore('daily_plans', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('checkins')) {
          db.createObjectStore('checkins', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('body_state')) {
          db.createObjectStore('body_state', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('ai_memory')) {
          db.createObjectStore('ai_memory', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ===== Weight =====
  async function getLatestWeight() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('weight_records', 'readonly');
      const store = tx.objectStore('weight_records');
      const req = store.openCursor(null, 'prev');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          resolve({ id: cursor.value.id, weight_kg: cursor.value.weight_kg, recorded_at: cursor.value.recorded_at });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveWeight(weightKg, source = 'manual', bodyFatPct = null, notes = null) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('weight_records', 'readwrite');
      const store = tx.objectStore('weight_records');
      const rec = { weight_kg: weightKg, source, body_fat_pct: bodyFatPct, notes,
        recorded_at: new Date().toISOString() };
      const req = store.add(rec);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteWeight(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('weight_records', 'readwrite');
      const req = tx.objectStore('weight_records').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function getWeightTrend(days = 30) {
    const db = await open();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('weight_records', 'readonly');
      const req = tx.objectStore('weight_records').getAll();
      req.onsuccess = () => {
        const rows = req.result
          .filter(r => new Date(r.recorded_at) >= cutoff)
          .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
          .map(r => ({ recorded_at: r.recorded_at, weight_kg: r.weight_kg }));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ===== Daily Plans =====
  async function getTodayPlan(dateStr) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('daily_plans', 'readonly');
      const req = tx.objectStore('daily_plans').getAll();
      req.onsuccess = () => {
        const row = req.result.find(r => r.plan_date === dateStr);
        resolve(row || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveTodayPlan(dateStr, breakfast, lunch, dinner, exercise, notes = '') {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('daily_plans', 'readwrite');
      const store = tx.objectStore('daily_plans');
      // Delete existing plan for this date
      const delReq = store.getAll();
      delReq.onsuccess = () => {
        const existing = delReq.result.filter(r => r.plan_date === dateStr);
        existing.forEach(r => store.delete(r.id));
        const rec = { plan_date: dateStr, breakfast, lunch, dinner, exercise,
          extra_notes: notes, generated_at: new Date().toISOString(), modified: 0 };
        store.add(rec);
        resolve();
      };
      delReq.onerror = () => reject(delReq.error);
    });
  }

  // ===== Checkins =====
  async function getTodayCheckins(dateStr) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkins', 'readonly');
      const req = tx.objectStore('checkins').getAll();
      req.onsuccess = () => {
        resolve(req.result.filter(r => r.checkin_date === dateStr));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveCheckin(dateStr, mealType, photoPath, note, completed = 1) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkins', 'readwrite');
      const store = tx.objectStore('checkins');
      // Delete existing same date+type
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const dupes = getAll.result.filter(r => r.checkin_date === dateStr && r.meal_type === mealType);
        dupes.forEach(r => store.delete(r.id));
        const rec = { checkin_date: dateStr, meal_type: mealType, photo_path: photoPath,
          note, completed, created_at: new Date().toISOString() };
        store.add(rec);
        resolve();
      };
      getAll.onerror = () => reject(getAll.error);
    });
  }

  async function getLastCheckinDate() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkins', 'readonly');
      const store = tx.objectStore('checkins');
      const req = store.index('id') ? null : store.getAll();
      // Since we don't have a checkin_date index, use getAll and find max
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const dates = allReq.result.map(r => r.checkin_date).sort().reverse();
        resolve(dates[0] || null);
      };
      allReq.onerror = () => reject(allReq.error);
    });
  }

  // ===== Week Schedule =====
  async function getWeekSchedule(weekStart) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('weekly_schedule', 'readonly');
      const req = tx.objectStore('weekly_schedule').getAll();
      req.onsuccess = () => {
        resolve(req.result.filter(r => r.week_start === weekStart));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveWeekSchedule(weekStart, dayOfWeek, scheduleDate, planNotes) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('weekly_schedule', 'readwrite');
      const store = tx.objectStore('weekly_schedule');
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const dupes = allReq.result.filter(r => r.week_start === weekStart && r.day_of_week === dayOfWeek);
        dupes.forEach(r => store.delete(r.id));
        store.add({ week_start: weekStart, day_of_week: dayOfWeek, schedule_date: scheduleDate,
          plan_notes: planNotes, created_at: new Date().toISOString() });
        resolve();
      };
      allReq.onerror = () => reject(allReq.error);
    });
  }

  // ===== Week Stats =====
  async function getWeekStats(weekStart) {
    const db = await open();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const ws = weekStart;
    const we = weekEnd.toISOString().slice(0, 10);

    const tx = db.transaction(['checkins', 'weight_records'], 'readonly');
    const ckReq = tx.objectStore('checkins').getAll();
    const wtReq = tx.objectStore('weight_records').getAll();

    return new Promise((resolve) => {
      Promise.all([
        new Promise(r => { ckReq.onsuccess = () => r(ckReq.result); }),
        new Promise(r => { wtReq.onsuccess = () => r(wtReq.result); }),
      ]).then(([checkins, weights]) => {
        const weekCk = checkins.filter(c => c.checkin_date >= ws && c.checkin_date < we);
        const totalCheckins = weekCk.length;
        const days = new Set(weekCk.map(c => c.checkin_date)).size;
        const weekWt = weights
          .filter(w => w.recorded_at >= ws && w.recorded_at < we)
          .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
        resolve({
          total_checkins: totalCheckins,
          active_days: days,
          start_weight: weekWt.length > 0 ? weekWt[0].weight_kg : null,
          end_weight: weekWt.length > 0 ? weekWt[weekWt.length - 1].weight_kg : null,
          weight_change: weekWt.length >= 2
            ? Math.round((weekWt[weekWt.length - 1].weight_kg - weekWt[0].weight_kg) * 100) / 100 : null,
        });
      });
    });
  }

  // ===== Body State =====
  async function saveBodyState(dateStr, sleepHours, sleepQuality, mood, notes) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('body_state', 'readwrite');
      const store = tx.objectStore('body_state');
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const dupes = allReq.result.filter(r => r.recorded_date === dateStr);
        dupes.forEach(r => store.delete(r.id));
        store.add({ recorded_date: dateStr, sleep_hours: sleepHours, sleep_quality: sleepQuality,
          mood, notes, created_at: new Date().toISOString() });
        resolve();
      };
      allReq.onerror = () => reject(allReq.error);
    });
  }

  // ===== AI Memory =====
  async function getAiMemories(limit = 10) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('ai_memory', 'readonly');
      const req = tx.objectStore('ai_memory').getAll();
      req.onsuccess = () => {
        const sorted = req.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        resolve(sorted.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function saveAiMemory(content, category = 'insight') {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('ai_memory', 'readwrite');
      const req = tx.objectStore('ai_memory').add({
        memory_date: new Date().toISOString().slice(0, 10), category, content,
        created_at: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ===== User Profile =====
  async function getUserProfile() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('user_profile', 'readonly');
      const req = tx.objectStore('user_profile').get(1);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function updateUserProfile(fields) {
    const db = await open();
    const profile = await getUserProfile();
    if (!profile) return;
    Object.assign(profile, fields);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('user_profile', 'readwrite');
      tx.objectStore('user_profile').put(profile);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ===== History =====
  async function getCheckinHistory(days = 7) {
    const db = await open();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('checkins', 'readonly');
      const req = tx.objectStore('checkins').getAll();
      req.onsuccess = () => {
        const rows = req.result
          .filter(r => r.checkin_date >= cutoffStr)
          .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ===== Init =====
  async function initDB() {
    await open(); // triggers onupgradeneeded if needed
  }

  return {
    initDB,
    getLatestWeight, saveWeight, deleteWeight, getWeightTrend,
    getTodayPlan, saveTodayPlan,
    getTodayCheckins, saveCheckin, getLastCheckinDate, getCheckinHistory,
    getWeekSchedule, saveWeekSchedule, getWeekStats,
    saveBodyState,
    getAiMemories, saveAiMemory,
    getUserProfile, updateUserProfile,
  };
})();
