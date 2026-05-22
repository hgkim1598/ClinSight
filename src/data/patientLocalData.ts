/**
 * 환자 로컬 매핑 데이터
 *
 * DB(Aurora)에는 비식별 정보만 저장되어 있어서 (PHI 정책),
 * 이름, 생년월일, 나이(원본), 신체 정보는 프론트에서 보관합니다.
 *
 * 사용법:
 *   import { patientLocalData } from '@/data/patientLocalData';
 *   const info = patientLocalData['PT-8A8466C1'];
 *   // info.name → '최민준', info.age → 52
 *
 * 나중에 별도 Lambda/API로 전환하면 이 파일을 삭제하고
 * API 호출로 대체하면 됩니다.
 */

export interface PatientLocalInfo {
  name: string;
  dateOfBirth: string;
  age: number;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
}

export const patientLocalData: Record<string, PatientLocalInfo> = {
  "PT-0A502AC9": {
    name: "장민준",
    dateOfBirth: "1943-05-12",
    age: 82,
    weightKg: 55.6,
    heightCm: 164.0,
    bmi: 20.7,
  },
  "PT-10FD3623": {
    name: "박유나",
    dateOfBirth: "1941-08-22",
    age: 84,
    weightKg: 50.3,
    heightCm: 155.0,
    bmi: 20.9,
  },
  "PT-1B4EF516": {
    name: "권민혁",
    dateOfBirth: "1962-03-15",
    age: 63,
    weightKg: 78.4,
    heightCm: 175.0,
    bmi: 25.6,
  },
  "PT-1CF4027B": {
    name: "윤시우",
    dateOfBirth: "1965-07-03",
    age: 60,
    weightKg: 71.2,
    heightCm: 170.0,
    bmi: 24.6,
  },
  "PT-24D207D7": {
    name: "권재원",
    dateOfBirth: "1965-11-20",
    age: 60,
    weightKg: 68.5,
    heightCm: 172.0,
    bmi: 23.2,
  },
  "PT-352EE421": {
    name: "한도윤",
    dateOfBirth: "1956-09-08",
    age: 69,
    weightKg: 74.8,
    heightCm: 168.0,
    bmi: 26.5,
  },
  "PT-35F07227": {
    name: "최지아",
    dateOfBirth: "1938-12-01",
    age: 87,
    weightKg: 45.2,
    heightCm: 152.0,
    bmi: 19.6,
  },
  "PT-383C07DA": {
    name: "최나연",
    dateOfBirth: "1979-04-17",
    age: 46,
    weightKg: 58.7,
    heightCm: 163.0,
    bmi: 22.1,
  },
  "PT-3C79B9FB": {
    name: "조재원",
    dateOfBirth: "1945-06-25",
    age: 80,
    weightKg: 57.7,
    heightCm: 163.0,
    bmi: 21.7,
  },
  "PT-51C05C7F": {
    name: "조지유",
    dateOfBirth: "1982-10-30",
    age: 43,
    weightKg: 52.1,
    heightCm: 160.0,
    bmi: 20.4,
  },
  "PT-5C0D891E": {
    name: "장지호",
    dateOfBirth: "1944-02-14",
    age: 81,
    weightKg: 60.3,
    heightCm: 166.0,
    bmi: 21.9,
  },
  "PT-67A25264": {
    name: "임승현",
    dateOfBirth: "1952-08-07",
    age: 73,
    weightKg: 69.1,
    heightCm: 170.0,
    bmi: 23.9,
  },
  "PT-73C01407": {
    name: "신지호",
    dateOfBirth: "1962-01-11",
    age: 63,
    weightKg: 76.2,
    heightCm: 174.0,
    bmi: 25.2,
  },
  "PT-7A3F981D": {
    name: "한채원",
    dateOfBirth: "1939-03-28",
    age: 86,
    weightKg: 48.5,
    heightCm: 156.0,
    bmi: 19.9,
  },
  "PT-8509A2DF": {
    name: "신서윤",
    dateOfBirth: "1956-06-19",
    age: 69,
    weightKg: 54.8,
    heightCm: 159.0,
    bmi: 21.7,
  },
  "PT-8A28432E": {
    name: "조예준",
    dateOfBirth: "1940-11-05",
    age: 85,
    weightKg: 62.4,
    heightCm: 167.0,
    bmi: 22.4,
  },
  "PT-8A8466C1": {
    name: "최민준",
    dateOfBirth: "1972-01-28",
    age: 52,
    weightKg: 82.9,
    heightCm: 173.0,
    bmi: 27.7,
  },
  "PT-924E66A0": {
    name: "안승현",
    dateOfBirth: "1946-04-02",
    age: 79,
    weightKg: 64.7,
    heightCm: 169.0,
    bmi: 22.6,
  },
  "PT-945B9296": {
    name: "장서준",
    dateOfBirth: "1954-07-16",
    age: 71,
    weightKg: 72.3,
    heightCm: 171.0,
    bmi: 24.7,
  },
  "PT-94991651": {
    name: "정하준",
    dateOfBirth: "1970-12-09",
    age: 55,
    weightKg: 80.1,
    heightCm: 176.0,
    bmi: 25.9,
  },
  "PT-97F3E33D": {
    name: "김예준",
    dateOfBirth: "1999-05-23",
    age: 26,
    weightKg: 75.0,
    heightCm: 178.0,
    bmi: 23.7,
  },
  "PT-BE61970F": {
    name: "박민혁",
    dateOfBirth: "1948-09-14",
    age: 77,
    weightKg: 66.8,
    heightCm: 168.0,
    bmi: 23.7,
  },
  "PT-C083FA41": {
    name: "최유나",
    dateOfBirth: "1983-06-07",
    age: 42,
    weightKg: 56.2,
    heightCm: 162.0,
    bmi: 21.4,
  },
  "PT-CD6D8714": {
    name: "오혜진",
    dateOfBirth: "1966-02-25",
    age: 59,
    weightKg: 61.5,
    heightCm: 161.0,
    bmi: 23.7,
  },
  "PT-CD86F28C": {
    name: "오민혁",
    dateOfBirth: "1956-10-31",
    age: 69,
    weightKg: 70.6,
    heightCm: 172.0,
    bmi: 23.9,
  },
  "PT-DCF13B91": {
    name: "김나연",
    dateOfBirth: "1973-08-18",
    age: 52,
    weightKg: 55.4,
    heightCm: 158.0,
    bmi: 22.2,
  },
  "PT-DE258525": {
    name: "박나연",
    dateOfBirth: "1953-04-06",
    age: 72,
    weightKg: 53.9,
    heightCm: 157.0,
    bmi: 21.9,
  },
  "PT-ED764B2D": {
    name: "임예준",
    dateOfBirth: "1973-03-12",
    age: 52,
    weightKg: 77.3,
    heightCm: 175.0,
    bmi: 25.2,
  },
  "PT-F30086E8": {
    name: "강다은",
    dateOfBirth: "1940-07-21",
    age: 85,
    weightKg: 47.8,
    heightCm: 154.0,
    bmi: 20.2,
  },
  "PT-F780901A": {
    name: "이지유",
    dateOfBirth: "1943-11-15",
    age: 82,
    weightKg: 51.6,
    heightCm: 156.0,
    bmi: 21.2,
  },
};

/**
 * patient_token으로 로컬 정보 조회
 * 없으면 기본값 반환
 */
export function getPatientLocal(patientToken: string): PatientLocalInfo {
  return patientLocalData[patientToken] ?? {
    name: patientToken,
    dateOfBirth: "-",
    age: 0,
    weightKg: null,
    heightCm: null,
    bmi: null,
  };
}
