"""
AI 每日计划生成器 v2.1
感知：体重趋势 + 天气 + 周安排 + 历史偏好 + 最近食谱
所有食谱含热量估算
"""
import random, json
from datetime import datetime, date, timedelta
from slim.health import calc_bmi, calc_bmr, calc_tdee, calc_target_calories
from slim.database import (
    get_latest_weight, get_weight_trend, get_week_schedule,
    get_ai_memories, get_user_profile, get_db
)

# (名称, 详情, 理由, 热量kcal)
BREAKFASTS = [
    ("经典牛奶燕麦碗", "30g燕麦+300ml牛奶+半个苹果", "稳血糖，饱腹到中午", 320),
    ("肉桂苹果燕麦碗", "30g燕麦+250ml牛奶+半个苹果+肉桂粉", "肉桂稳血糖，想吃甜的早上", 310),
    ("可可香蕉燕麦碗", "30g燕麦+250ml牛奶+半根香蕉+可可粉", "可可满足感强，幸福感早餐", 340),
    ("香蕉花生酱吐司", "全麦2片+半根香蕉+花生酱5g+无糖酸奶", "高蛋白好脂肪扛饿", 380),
    ("鸡蛋火腿三明治", "全麦2片+煎蛋1个+火腿20g+生菜", "咸口硬核扎实", 360),
    ("豆乳燕麦碗", "30g燕麦+250ml豆乳+蓝莓+香蕉", "植物蛋白清爽不腻", 300),
    ("清粥小菜", "小米粥+水煮蛋1个+凉拌黄瓜", "肠胃需要休息时", 220),
]

LUNCHES = [
    ("韩式肥牛拌饭", "肥牛卷+菠菜+豆芽+太阳蛋+藜麦饭+辣酱(少量)", "味觉刺激拉满", 520),
    ("番茄虾仁菌菇汤+藜麦饭", "番茄+虾仁+菌菇+藜麦饭半碗", "鲜甜暖胃高蛋白", 380),
    ("黑椒菌菇炒牛肉盖饭", "牛肉+菌菇+青菜+藜麦饭", "黑椒满足蛋白质拉满", 480),
    ("泰式酸辣鸡丝拌面", "鸡胸肉+荞麦面+生菜+柠檬汁+小米辣+鱼露", "酸辣清爽低脂", 350),
    ("番茄炒蛋+藜麦饭+时蔬", "番茄+鸡蛋+藜麦饭+当季蔬菜", "家常舒适不踩雷", 400),
    ("鸡胸肉沙拉+糙米饭", "鸡胸肉+生菜+紫甘蓝+糙米饭50g", "便当友好", 320),
    ("时蔬炒藜麦饭", "鸡蛋+茼蒿+葱油+藜麦饭(量加大)", "一个人吃饭的幸福感", 440),
    ("香煎鳕鱼+藜麦饭+炒油菜", "鳕鱼+藜麦饭+油菜+冬瓜汤", "高蛋白低脂", 370),
    ("卤鸡腿荞麦面", "卤鸡腿+荞麦面80g+生菜", "卤味解馋不油腻", 400),
]

DINNERS = [
    ("裙带菜豆腐汤+小包子", "豆腐+裙带菜+鸡蛋+小包子半个", "暖汤收尾不撑胃", 250),
    ("无水焖菜(牛肉版)", "西兰花+牛肉卷+菌菇+生菜+藜麦饭", "一锅出省事治愈", 350),
    ("番茄豆腐虾仁汤+藜麦饭", "番茄+豆腐+虾仁+藜麦饭半碗", "低脂高蛋白睡前不负担", 280),
    ("紫菜蛋花汤+小包子", "紫菜+鸡蛋+豆腐+小包子半个", "极简暖胃十分钟", 220),
    ("萝卜虾皮汤+蒸包子", "白萝卜+虾皮+鸡蛋+小包子半个", "冬天暖身", 240),
    ("冬瓜裙带菜汤+糙米饭", "冬瓜+裙带菜+糙米饭+酱牛肉", "排水消肿", 300),
    ("菠菜鸡蛋汤+藜麦饭", "菠菜+鸡蛋+藜麦饭半碗", "简单舒服零负担", 260),
    ("菌菇豆腐汤+糙米饭+酱牛肉", "蘑菇+嫩豆腐+糙米饭+酱牛肉", "鲜甜浓郁满足", 320),
]

EXERCISES = [
    ("步行3公里", "膝盖友好约200大卡", "想轻松动一下", 200),
    ("扭胯10分钟+摇花手", "在家就能做", "不想出门", 80),
    ("步行4公里", "稍加量约300大卡", "状态不错", 300),
    ("休息日", "恢复也是健康", "累了/不想动/下雨", 0),
    ("10分钟轻量舒展", "摆臂转腰拉伸", "刚恢复节奏", 40),
]

# 外食建议（午餐在外面吃的时候用）
EATING_OUT_TIPS = [
    ("外食：优先蒸煮", "选蒸鱼/白切鸡/清炒时蔬+半碗米饭", "避开油炸和重酱汁", 450),
    ("外食：麻辣烫/火锅", "多蔬菜+豆腐+瘦肉类，少丸子少麻酱", "汤底选清汤/菌汤", 400),
    ("外食：便利店组合", "鸡胸肉+溏心蛋+蔬菜沙拉+饭团半个", "便利店也能健康", 380),
    ("外食：面条店", "选清汤面+加个蛋+烫青菜，少喝汤", "汤面比拌面油少", 420),
]

MOTTOS = {
    "down": ["体重在往下走，今天继续稳稳的～", "趋势不错！按自己的节奏来就好", "身体在悄悄变轻，不急不急"],
    "up": ["体重波动很正常，可能只是水分", "数字上涨不慌，长期趋势才是真相", "身体有自己的节奏，听听它的"],
    "stable": ["稳稳的就是最好的进度", "今天做自己就好", "一顿饭不会改变什么，一天也不会"],
}

def _get_recent_meals(days=3):
    conn = get_db()
    rows = conn.execute(
        "SELECT plan_date, breakfast, lunch, dinner FROM daily_plans "
        "WHERE plan_date >= date('now','localtime',?) ORDER BY plan_date DESC LIMIT ?",
        (f'-{days} days', days)
    ).fetchall()
    conn.close()
    recent = []
    for r in rows:
        for field in ['breakfast', 'lunch', 'dinner']:
            try:
                data = json.loads(r[field])
                if data and data.get('name'):
                    recent.append(data['name'])
            except: pass
    return recent

def _pick(pool, recent, rng):
    fresh = [item for item in pool if item[0] not in recent]
    if len(fresh) >= 2: return rng.choice(fresh)
    return rng.choice(pool)

def get_week_monday():
    t = date.today()
    return (t - timedelta(days=t.weekday())).strftime("%Y-%m-%d")

def generate_weekly_prompts():
    names = ["周一","周二","周三","周四","周五","周六","周日"]
    m = date.today() - timedelta(days=date.today().weekday())
    return [{"day": names[i], "date": (m+timedelta(days=i)).strftime("%Y-%m-%d"),
             "date_display": f"{(m+timedelta(days=i)).month}/{(m+timedelta(days=i)).day}"} for i in range(7)]

def generate_daily_plan(today_str=None, weather=None, weight_kg=None):
    if today_str is None: today_str = date.today().strftime("%Y-%m-%d")
    td = datetime.strptime(today_str, "%Y-%m-%d").date()
    wd = td.weekday()

    if weight_kg is None:
        latest = get_latest_weight()
        weight_kg = latest["weight_kg"] if latest else None

    trend_data = get_weight_trend(7)
    trend = "stable"
    if len(trend_data) >= 3:
        diff = trend_data[-1]["weight_kg"] - trend_data[0]["weight_kg"]
        if diff < -0.3: trend = "down"
        elif diff > 0.3: trend = "up"

    ws = (td - timedelta(days=td.weekday())).strftime("%Y-%m-%d")
    schedules = get_week_schedule(ws)
    today_schedule = ""
    for s in schedules:
        if s["schedule_date"] == today_str:
            today_schedule = s.get("plan_notes", "") or ""
            break

    recent = _get_recent_meals(3)
    rng = random.Random(today_str + str(weight_kg or 0))

    is_rain = weather and ("雨" in weather or "rain" in weather.lower())
    is_work = today_schedule and any(w in today_schedule for w in ["上班","打工","工作","忙"])
    is_outing = today_schedule and any(w in today_schedule for w in ["外出","外食","约","聚会","逛街","外面"])
    is_rest = wd >= 5 or (today_schedule and any(w in today_schedule for w in ["休息","宅","在家"]))

    # 早餐
    if is_rain:
        pool = [b for b in BREAKFASTS if "燕麦" in b[0] or "粥" in b[0]]
    elif is_work:
        pool = [b for b in BREAKFASTS if "三明治" in b[0] or "吐司" in b[0] or "燕麦" in b[0]]
    else:
        pool = BREAKFASTS
    bf = _pick(pool, recent, rng)

    # 午餐：外食日给外食建议
    if is_outing:
        lu = rng.choice(EATING_OUT_TIPS)
    elif trend == "up":
        pool = [l for l in LUNCHES if "沙拉" in l[0] or "虾仁" in l[0] or "鳕鱼" in l[0]]
        lu = _pick(pool, recent, rng)
    else:
        lu = _pick(LUNCHES, recent, rng)

    # 晚餐
    di = _pick(DINNERS, recent, rng)

    # 运动
    if is_work:
        ex = EXERCISES[3]
    elif is_rain:
        ex = EXERCISES[1]
    elif trend == "down":
        ex = EXERCISES[2]
    else:
        ex = EXERCISES[rng.randint(0, 2)]

    # 每日一句
    pool = MOTTOS.get(trend, MOTTOS["stable"])
    if is_rain: pool = ["下雨天活着就很厉害了"] + pool
    if is_rest: pool = pool + ["周末快乐！不用太紧绷～"]
    if is_outing: pool = pool + ["在外面吃也没关系，选对就行"]
    motto = rng.choice(pool)

    # 健康计算
    profile = get_user_profile()
    bmi = calc_bmi(weight_kg, profile.get("height_cm")) if weight_kg else None
    bmr = calc_bmr(weight_kg, profile.get("height_cm"), profile.get("age")) if weight_kg else None
    tdee = calc_tdee(bmr, profile.get("activity_level","light")) if bmr else None
    target_cal = calc_target_calories(tdee) if tdee else None

    total_cal = bf[3] + lu[3] + di[3]

    return {
        "date": today_str,
        "weekday": ["周一","周二","周三","周四","周五","周六","周日"][wd],
        "weight": weight_kg, "trend": trend,
        "weather": weather or "未知", "schedule": today_schedule or "暂无安排",
        "breakfast": {"name": bf[0], "detail": bf[1], "reason": bf[2], "calories": bf[3]},
        "lunch": {"name": lu[0], "detail": lu[1], "reason": lu[2], "calories": lu[3]},
        "dinner": {"name": di[0], "detail": di[1], "reason": di[2], "calories": di[3]},
        "exercise": {"name": ex[0], "detail": ex[1], "reason": ex[2], "calories_burn": ex[3]},
        "total_calories": total_cal, "target_calories": target_cal, "bmr": bmr, "tdee": tdee, "bmi": bmi, "motto": motto,
    }
