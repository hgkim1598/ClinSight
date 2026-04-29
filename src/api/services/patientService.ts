/**
 * Patient Service
 *
 * 현재: mock 데이터 반환 (src/api/mock/patients.ts)
 * API 전환 시:
 *   1. mock import 제거
 *   2. request<T>()를 사용하여 API 호출로 교체
 *   3. endpoint 예시:
 *      - GET /patients
 *      - GET /patients/{id}
 *
 * 참고: docs/DYNAMO_SCHEMA.md §4 Patients
 */
import type { Patient } from '../../types';
import { patients } from '../mock/patients';

export async function getPatients(): Promise<Patient[]> {
  return patients;
}

export async function getPatientById(id: string): Promise<Patient | undefined> {
  return patients.find((p) => p.id === id);
}
