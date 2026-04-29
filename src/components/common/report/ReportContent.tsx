import type {
  PatientReport,
  ReportVitalRow,
  VitalStatusLevel,
} from '../../../types';
import { RISK_LABELS } from '../../../utils/constants';

interface ReportContentProps {
  report: PatientReport;
}

const STATUS_LABEL: Record<VitalStatusLevel, string> = {
  normal: '정상',
  attention: '주의',
  critical: '위험',
};

function formatVitalValue(row: ReportVitalRow): string {
  if (row.latestValue == null) return '—';
  const rounded = Number.isInteger(row.latestValue)
    ? `${row.latestValue}`
    : row.latestValue.toFixed(1);
  return `${rounded} ${row.unit}`;
}

export default function ReportContent({ report }: ReportContentProps) {
  const { patient, vitals, labs, predictions } = report;

  return (
    <>
      <section className="report-paper__section">
        <h3 className="report-paper__section-title">환자 기본정보</h3>
        <table className="report-table report-table--info">
          <tbody>
            <tr>
              <th>환자 ID</th>
              <td>{patient.id}</td>
              <th>이름</th>
              <td>{patient.name}</td>
            </tr>
            <tr>
              <th>나이/성별</th>
              <td>{`${patient.age}세 / ${patient.sex}`}</td>
              <th>병상</th>
              <td>{patient.bed}</td>
            </tr>
            <tr>
              <th>입실시간</th>
              <td>{patient.admit}</td>
              <th>주진단</th>
              <td>{patient.diag}</td>
            </tr>
            <tr>
              <th>SOFA</th>
              <td>{patient.sofa}</td>
              <th>Sepsis Onset</th>
              <td>{patient.sepsisOnset ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="report-paper__section">
        <h3 className="report-paper__section-title">
          최근 활력징후 (Latest Vital Signs)
        </h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>최근 값</th>
              <th>측정 시각</th>
              <th>정상 범위</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {vitals.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="report-table__num">{formatVitalValue(row)}</td>
                <td>{row.latestTime ?? '—'}</td>
                <td>
                  {row.normalRange[0]}–{row.normalRange[1]} {row.unit}
                </td>
                <td>
                  <span
                    className={`report-pill report-pill--vital report-pill--vital-${row.status}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-paper__section">
        <h3 className="report-paper__section-title">
          주요 검사 결과 (Key Lab Results)
        </h3>
        {labs.length === 0 ? (
          <p className="report-paper__empty">
            표시 가능한 검사 결과가 없습니다.
          </p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>검사 항목</th>
                <th>최근 값</th>
                <th>측정 시각</th>
                <th>정상 범위</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((lab) => (
                <tr key={lab.label}>
                  <td>{lab.label}</td>
                  <td className="report-table__num">
                    {lab.value}
                    {lab.unit ? ` ${lab.unit}` : ''}
                  </td>
                  <td>{lab.time}</td>
                  <td>{lab.normalRange}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="report-paper__section">
        <h3 className="report-paper__section-title">AI 예후 예측 결과</h3>
        <table className="report-table">
          <thead>
            <tr>
              <th>모델</th>
              <th>예측 확률</th>
              <th>위험 등급</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => (
              <tr key={p.key}>
                <td>{p.title}</td>
                <td className="report-table__num">{p.probability}%</td>
                <td>
                  <span
                    className={`report-pill report-pill--risk report-pill--risk-${p.risk}`}
                  >
                    {RISK_LABELS[p.risk]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="report-paper__disclaimer">
          AI 생성 예측 결과 · 임상 판단 대체 불가
        </p>
      </section>
    </>
  );
}
