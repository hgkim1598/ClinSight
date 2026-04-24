import type { VitalData } from '../../types';

const times = [
  '-24h', '-22h', '-20h', '-18h', '-16h', '-14h', '-12h',
  '-10h', '-8h', '-6h', '-4h', '-2h', 'Now',
];

const pt19482: VitalData = {
  series: {
    hr: {
      label: 'Heart Rate',
      unit: 'bpm',
      data: [82, 84, 86, 88, 90, 92, 95, 98, 102, 104, 106, 108, 107.4],
      normal: [60, 100],
      times,
    },
    map: {
      label: 'MAP',
      unit: 'mmHg',
      data: [78, 76, 74, 72, 70, 68, 66, 65, 62, 60, 59, 58, 58],
      normal: [65, 90],
      times,
    },
    spo2: {
      label: 'SpO₂',
      unit: '%',
      data: [97, 97, 96, 96, 95, 95, 94, 94, 93, 92, 92, 91, 91],
      normal: [94, 100],
      times,
    },
    rr: {
      label: 'Respiratory Rate',
      unit: '/min',
      data: [18, 19, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 28],
      normal: [12, 20],
      times,
    },
    temp: {
      label: 'Temperature',
      unit: '°C',
      data: [37.2, 37.4, 37.6, 37.8, 38.0, 38.2, 38.4, 38.6, 38.7, 38.8, 38.9, 38.9, 38.9],
      normal: [36.0, 37.5],
      times,
    },
  },
  labs: [
    { time: '-18h', label: 'Lac', value: 2.1 },
    { time: '-12h', label: 'Lac', value: 3.4 },
    { time: '-6h', label: 'Lac', value: 4.6 },
    { time: 'Now', label: 'Lac', value: 5.2 },
    { time: '-12h', label: 'Cre', value: 1.6 },
    { time: '-2h', label: 'Cre', value: 2.1 },
  ],
};

const emptyVitals: VitalData = {
  series: {
    hr: { label: 'Heart Rate', unit: 'bpm', data: [], normal: [60, 100], times: [] },
    map: { label: 'MAP', unit: 'mmHg', data: [], normal: [65, 90], times: [] },
    spo2: { label: 'SpO₂', unit: '%', data: [], normal: [94, 100], times: [] },
    rr: { label: 'Respiratory Rate', unit: '/min', data: [], normal: [12, 20], times: [] },
    temp: { label: 'Temperature', unit: '°C', data: [], normal: [36.0, 37.5], times: [] },
  },
  labs: [],
};

export const vitalsByPatient: Record<string, VitalData> = {
  'PT-19482': pt19482,
};

export { emptyVitals };
