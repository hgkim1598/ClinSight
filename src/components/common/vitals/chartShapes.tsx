import { CRE_DANGER_THRESHOLD, DOT_INFO } from './vitalConfig';

interface DotShapeProps {
  cx?: number;
  cy?: number;
  payload?: Record<string, number | null | undefined>;
}

export function LacShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.lacValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={DOT_INFO.lac.color(v)}
        stroke="var(--card)"
        strokeWidth={1}
      />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Lac {v}
      </text>
    </g>
  );
}

export function CreShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.creValue;
  if (cx == null || cy == null || v == null) return null;
  const elevated = v > CRE_DANGER_THRESHOLD;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={DOT_INFO.cre.color(v)}
        stroke="var(--card)"
        strokeWidth={1}
      />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Cre {v}
        {elevated ? '↑' : ''}
      </text>
    </g>
  );
}

export function PfRatioShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.pfValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={DOT_INFO.pf_ratio.color(v)}
        stroke="var(--card)"
        strokeWidth={1}
      />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        P/F {v}
      </text>
    </g>
  );
}

export function PlateletShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.pltValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={DOT_INFO.platelet.color(v)}
        stroke="var(--card)"
        strokeWidth={1}
      />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Plt {v}
      </text>
    </g>
  );
}

export function BilirubinShape({ cx, cy, payload }: DotShapeProps) {
  const v = payload?.bilValue;
  if (cx == null || cy == null || v == null) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={DOT_INFO.bilirubin.color(v)}
        stroke="var(--card)"
        strokeWidth={1}
      />
      <text x={cx + 7} y={cy + 3.5} fontSize={10} fill="var(--text-secondary)">
        Bil {v}
      </text>
    </g>
  );
}
