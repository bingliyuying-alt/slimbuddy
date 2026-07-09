"""健康计算引擎：BMI, BMR, TDEE, 热量目标"""
def calc_bmi(weight_kg, height_cm):
    if not weight_kg or not height_cm: return None
    return round(float(weight_kg) / ((float(height_cm) / 100) ** 2), 1)

def calc_bmr(weight_kg, height_cm, age, gender='female'):
    if not all([weight_kg, height_cm, age]): return None
    try: age = int(age)
    except: return None
    bmr = 10 * float(weight_kg) + 6.25 * float(height_cm) - 5 * age
    return round(bmr - 161 if gender == 'female' else bmr + 5)

def calc_tdee(bmr, activity='light'):
    if not bmr: return None
    factors = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725}
    factor = factors.get(str(activity), 1.375)
    return round(bmr * factor)

def calc_target_calories(tdee, deficit=400):
    if not tdee: return None
    return max(tdee - deficit, 1200)

def bmi_label(bmi):
    if bmi is None: return '未知'
    if bmi < 18.5: return '偏瘦'
    if bmi < 24: return '正常'
    if bmi < 28: return '偏胖'
    return '肥胖'
