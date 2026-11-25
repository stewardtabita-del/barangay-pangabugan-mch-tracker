export interface VitalsInput {
  age?: number
  systolic_bp?: number
  diastolic_bp?: number
  blood_glucose?: number
  body_temp?: number
  heart_rate?: number
  gestational_weeks?: number
}

export interface RiskResult {
  level: 'Low' | 'Mid' | 'High'
  reasons: string[]
}

/**
 * Offline clinical decision-support classifier modeled on maternal health thresholds
 * (Preeclampsia / Gestational Diabetes / Sepsis / High-risk age indicators).
 */
export function assessMaternalRisk(vitals: VitalsInput): RiskResult {
  const reasons: string[] = []
  let score = 0

  // 1. Blood Pressure (Hypertension / Preeclampsia risk)
  if ((vitals.systolic_bp && vitals.systolic_bp >= 140) || (vitals.diastolic_bp && vitals.diastolic_bp >= 90)) {
    score += 3
    reasons.push(`High BP (${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg) — possible preeclampsia`)
  } else if ((vitals.systolic_bp && vitals.systolic_bp >= 130) || (vitals.diastolic_bp && vitals.diastolic_bp >= 85)) {
    score += 1
    reasons.push(`Elevated BP (${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg)`)
  }

  // 2. Blood Glucose (Gestational Diabetes risk, mmol/L)
  if (vitals.blood_glucose && vitals.blood_glucose >= 7.8) {
    score += 3
    reasons.push(`High blood glucose (${vitals.blood_glucose} mmol/L)`)
  } else if (vitals.blood_glucose && vitals.blood_glucose >= 6.8) {
    score += 1
    reasons.push(`Borderline blood glucose (${vitals.blood_glucose} mmol/L)`)
  }

  // 3. Body Temperature (Infection / Fever risk, °C)
  if (vitals.body_temp && vitals.body_temp >= 38.0) {
    score += 3
    reasons.push(`Fever detected (${vitals.body_temp} °C)`)
  } else if (vitals.body_temp && vitals.body_temp >= 37.5) {
    score += 1
    reasons.push(`Mildly elevated temperature (${vitals.body_temp} °C)`)
  }

  // 4. Maternal Heart Rate (Tachycardia, bpm)
  if (vitals.heart_rate && (vitals.heart_rate >= 110 || vitals.heart_rate < 55)) {
    score += 2
    reasons.push(`Abnormal heart rate (${vitals.heart_rate} bpm)`)
  }

  // 5. Maternal Age Risk
  if (vitals.age && (vitals.age < 18 || vitals.age >= 35)) {
    score += 1
    reasons.push(`High-risk maternal age (${vitals.age} yrs)`)
  }

  let level: 'Low' | 'Mid' | 'High' = 'Low'
  if (score >= 3) {
    level = 'High'
  } else if (score >= 1) {
    level = 'Mid'
  }

  if (reasons.length === 0) {
    reasons.push('All recorded vitals within normal maternal range')
  }

  return { level, reasons }
}