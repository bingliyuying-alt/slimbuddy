/**
 * SlimBuddy Plan Engine — 计划生成 + 健康计算
 * 从 slim/planner.py + slim/health.py 迁移到纯前端 JS
 */

// ===== Health Calculations (from slim/health.py) =====
const Health = {
  calcBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    return Math.round(weightKg / Math.pow(heightCm / 100, 2) * 10) / 10;
  },

  calcBMR(weightKg, heightCm, age, gender = 'female') {
    if (!weightKg || !heightCm || !age) return null;
    age = parseInt(age);
    if (isNaN(age)) return null;
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(gender === 'female' ? bmr - 161 : bmr + 5);
  },

  calcTDEE(bmr, activity = 'light') {
    if (!bmr) return null;
    const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
    return Math.round(bmr * (factors[activity] || 1.375));
  },

  calcTargetCalories(tdee, deficit = 400) {
    if (!tdee) return null;
    return Math.max(tdee - deficit, 1200);
  },

  bmiLabel(bmi) {
    if (bmi == null) return '未知';
    if (bmi < 18.5) return '偏瘦';
    if (bmi < 24) return '正常';
    if (bmi < 28) return '偏胖';
    return '肥胖';
  },
};

// ===== Recipe Data (from slim/planner.py) =====
const BREAKFASTS = [
  ['经典牛奶燕麦碗', '30g燕麦+300ml牛奶+半个苹果', '稳血糖，饱腹到中午', 320],
  ['肉桂苹果燕麦碗', '30g燕麦+250ml牛奶+半个苹果+肉桂粉', '肉桂稳血糖，想吃甜的早上', 310],
  ['可可香蕉燕麦碗', '30g燕麦+250ml牛奶+半根香蕉+可可粉', '可可满足感强，幸福感早餐', 340],
  ['香蕉花生酱吐司', '全麦2片+半根香蕉+花生酱5g+无糖酸奶', '高蛋白好脂肪扛饿', 380],
  ['鸡蛋火腿三明治', '全麦2片+煎蛋1个+火腿20g+生菜', '咸口硬核扎实', 360],
  ['豆乳燕麦碗', '30g燕麦+250ml豆乳+蓝莓+香蕉', '植物蛋白清爽不腻', 300],
  ['清粥小菜', '小米粥+水煮蛋1个+凉拌黄瓜', '肠胃需要休息时', 220],
];

const LUNCHES = [
  ['韩式肥牛拌饭', '肥牛卷+菠菜+豆芽+太阳蛋+藜麦饭+辣酱(少量)', '味觉刺激拉满', 520],
  ['番茄虾仁菌菇汤+藜麦饭', '番茄+虾仁+菌菇+藜麦饭半碗', '鲜甜暖胃高蛋白', 380],
  ['黑椒菌菇炒牛肉盖饭', '牛肉+菌菇+青菜+藜麦饭', '黑椒满足蛋白质拉满', 480],
  ['泰式酸辣鸡丝拌面', '鸡胸肉+荞麦面+生菜+柠檬汁+小米辣+鱼露', '酸辣清爽低脂', 350],
  ['番茄炒蛋+藜麦饭+时蔬', '番茄+鸡蛋+藜麦饭+当季蔬菜', '家常舒适不踩雷', 400],
  ['鸡胸肉沙拉+糙米饭', '鸡胸肉+生菜+紫甘蓝+糙米饭50g', '便当友好', 320],
  ['时蔬炒藜麦饭', '鸡蛋+茼蒿+葱油+藜麦饭(量加大)', '一个人吃饭的幸福感', 440],
  ['香煎鳕鱼+藜麦饭+炒油菜', '鳕鱼+藜麦饭+油菜+冬瓜汤', '高蛋白低脂', 370],
  ['卤鸡腿荞麦面', '卤鸡腿+荞麦面80g+生菜', '卤味解馋不油腻', 400],
];

const DINNERS = [
  ['裙带菜豆腐汤+小包子', '豆腐+裙带菜+鸡蛋+小包子半个', '暖汤收尾不撑胃', 250],
  ['无水焖菜(牛肉版)', '西兰花+牛肉卷+菌菇+生菜+藜麦饭', '一锅出省事治愈', 350],
  ['番茄豆腐虾仁汤+藜麦饭', '番茄+豆腐+虾仁+藜麦饭半碗', '低脂高蛋白睡前不负担', 280],
  ['紫菜蛋花汤+小包子', '紫菜+鸡蛋+豆腐+小包子半个', '极简暖胃十分钟', 220],
  ['萝卜虾皮汤+蒸包子', '白萝卜+虾皮+鸡蛋+小包子半个', '冬天暖身', 240],
  ['冬瓜裙带菜汤+糙米饭', '冬瓜+裙带菜+糙米饭+酱牛肉', '排水消肿', 300],
  ['菠菜鸡蛋汤+藜麦饭', '菠菜+鸡蛋+藜麦饭半碗', '简单舒服零负担', 260],
  ['菌菇豆腐汤+糙米饭+酱牛肉', '蘑菇+嫩豆腐+糙米饭+酱牛肉', '鲜甜浓郁满足', 320],
];

const EXERCISES = [
  ['步行3公里', '膝盖友好约200大卡', '想轻松动一下', 200],
  ['扭胯10分钟+摇花手', '在家就能做', '不想出门', 80],
  ['步行4公里', '稍加量约300大卡', '状态不错', 300],
  ['休息日', '恢复也是健康', '累了/不想动/下雨', 0],
  ['10分钟轻量舒展', '摆臂转腰拉伸', '刚恢复节奏', 40],
];

const EATING_OUT_TIPS = [
  ['外食：优先蒸煮', '选蒸鱼/白切鸡/清炒时蔬+半碗米饭', '避开油炸和重酱汁', 450],
  ['外食：麻辣烫/火锅', '多蔬菜+豆腐+瘦肉类，少丸子少麻酱', '汤底选清汤/菌汤', 400],
  ['外食：便利店组合', '鸡胸肉+溏心蛋+蔬菜沙拉+饭团半个', '便利店也能健康', 380],
  ['外食：面条店', '选清汤面+加个蛋+烫青菜，少喝汤', '汤面比拌面油少', 420],
];

const MOTTOS = {
  down: ['体重在往下走，今天继续稳稳的～', '趋势不错！按自己的节奏来就好', '身体在悄悄变轻，不急不急'],
  up: ['体重波动很正常，可能只是水分', '数字上涨不慌，长期趋势才是真相', '身体有自己的节奏，听听它的'],
  stable: ['稳稳的就是最好的进度', '今天做自己就好', '一顿饭不会改变什么，一天也不会'],
};

// ===== Plan Engine =====
const PlanEngine = (() => {
  // 伪随机（种子基于日期+体重，保证同一天结果一致）
  function _seededRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) - h) + seed.charCodeAt(i); h |= 0;
    }
    return () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
  }

  function _pick(pool, recent, seed) {
    const rng = _seededRandom(seed);
    const fresh = pool.filter(item => !recent.includes(item[0]));
    if (fresh.length >= 2) return fresh[Math.floor(rng() * fresh.length)];
    return pool[Math.floor(rng() * pool.length)];
  }

  async function _getRecentMeals(days = 3) {
    const plans = await DB.getWeightTrend(999);
    const recentNames = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    // Actually plans come from daily_plans... let's query those
    const db = await _openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('daily_plans', 'readonly');
      const req = tx.objectStore('daily_plans').getAll();
      req.onsuccess = () => {
        const recent = req.result
          .filter(r => r.plan_date >= cutoffStr)
          .sort((a, b) => b.plan_date.localeCompare(a.plan_date));
        const names = [];
        for (const r of recent) {
          for (const field of ['breakfast', 'lunch', 'dinner']) {
            try {
              const data = JSON.parse(r[field]);
              if (data && data.name) names.push(data.name);
            } catch (_) {}
          }
        }
        resolve(names);
      };
    });
  }

  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('slimbuddy', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function getWeekMonday() {
    const t = new Date();
    const d = t.getDay() || 7;
    t.setDate(t.getDate() - d + 1);
    return t.toISOString().slice(0, 10);
  }

  function generateWeeklyPrompts() {
    const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const m = new Date();
    m.setDate(m.getDate() - ((m.getDay() || 7) - 1));
    return names.map((name, i) => {
      const d = new Date(m);
      d.setDate(d.getDate() + i);
      return {
        day: name,
        date: d.toISOString().slice(0, 10),
        date_display: `${d.getMonth() + 1}/${d.getDate()}`,
      };
    });
  }

  async function generateDailyPlan(todayStr, weather, weightKg) {
    if (!todayStr) todayStr = new Date().toISOString().slice(0, 10);
    const td = new Date(todayStr);
    const wd = td.getDay(); // 0=Sun

    if (weightKg == null) {
      const latest = await DB.getLatestWeight();
      weightKg = latest ? latest.weight_kg : null;
    }

    const trendData = await DB.getWeightTrend(7);
    let trend = 'stable';
    if (trendData.length >= 3) {
      const diff = trendData[trendData.length - 1].weight_kg - trendData[0].weight_kg;
      if (diff < -0.3) trend = 'down';
      else if (diff > 0.3) trend = 'up';
    }

    const ws = getWeekMonday();
    const schedules = await DB.getWeekSchedule(ws);
    let todaySchedule = '';
    for (const s of schedules) {
      if (s.schedule_date === todayStr) { todaySchedule = s.plan_notes || ''; break; }
    }

    const recent = await _getRecentMeals(3);
    const seed = todayStr + (weightKg || 0);

    const isRain = weather && /雨|rain/i.test(weather);
    const isWork = todaySchedule && /上班|打工|工作|忙/.test(todaySchedule);
    const isOuting = todaySchedule && /外出|外食|约|聚会|逛街|外面/.test(todaySchedule);
    const isRest = wd === 0 || wd === 6 || (todaySchedule && /休息|宅|在家/.test(todaySchedule));

    // 早餐
    let pool;
    if (isRain) pool = BREAKFASTS.filter(b => b[0].includes('燕麦') || b[0].includes('粥'));
    else if (isWork) pool = BREAKFASTS.filter(b => b[0].includes('三明治') || b[0].includes('吐司') || b[0].includes('燕麦'));
    else pool = BREAKFASTS;
    const bf = _pick(pool, recent, seed + 'bf');

    // 午餐
    let lu;
    if (isOuting) {
      const rng = _seededRandom(seed + 'lu');
      lu = EATING_OUT_TIPS[Math.floor(rng() * EATING_OUT_TIPS.length)];
    } else if (trend === 'up') {
      const p = LUNCHES.filter(l => l[0].includes('沙拉') || l[0].includes('虾仁') || l[0].includes('鳕鱼'));
      lu = _pick(p, recent, seed + 'lu');
    } else {
      lu = _pick(LUNCHES, recent, seed + 'lu');
    }

    // 晚餐
    const di = _pick(DINNERS, recent, seed + 'di');

    // 运动
    let ex;
    if (isWork) ex = EXERCISES[3];
    else if (isRain) ex = EXERCISES[1];
    else if (trend === 'down') ex = EXERCISES[2];
    else {
      const rng = _seededRandom(seed + 'ex');
      ex = EXERCISES[Math.floor(rng() * 3)];
    }

    // 每日一句
    let poolM = MOTTOS[trend] || MOTTOS.stable;
    if (isRain) poolM = ['下雨天活着就很厉害了', ...poolM];
    if (isRest) poolM = [...poolM, '周末快乐！不用太紧绷～'];
    if (isOuting) poolM = [...poolM, '在外面吃也没关系，选对就行'];
    const rngM = _seededRandom(seed + 'm');
    const motto = poolM[Math.floor(rngM() * poolM.length)];

    // 健康计算
    const profile = await DB.getUserProfile();
    const bmi = Health.calcBMI(weightKg, profile ? profile.height_cm : null);
    const bmr = Health.calcBMR(weightKg, profile ? profile.height_cm : null, profile ? profile.age : null);
    const tdee = Health.calcTDEE(bmr, profile ? profile.activity_level : 'light');
    const targetCal = Health.calcTargetCalories(tdee);
    const totalCal = bf[3] + lu[3] + di[3];

    return {
      date: todayStr,
      weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][wd],
      weight: weightKg, trend,
      weather: weather || '未知', schedule: todaySchedule || '暂无安排',
      breakfast: { name: bf[0], detail: bf[1], reason: bf[2], calories: bf[3] },
      lunch: { name: lu[0], detail: lu[1], reason: lu[2], calories: lu[3] },
      dinner: { name: di[0], detail: di[1], reason: di[2], calories: di[3] },
      exercise: { name: ex[0], detail: ex[1], reason: ex[2], calories_burn: ex[3] },
      total_calories: totalCal, target_calories: targetCal, bmr, tdee, bmi, motto,
    };
  }

  return { getWeekMonday, generateWeeklyPrompts, generateDailyPlan };
})();
