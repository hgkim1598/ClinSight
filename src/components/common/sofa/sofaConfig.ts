import type { ComponentType } from 'react';
import type { OrganKey } from '../../../types';
import {
  BloodCellsIcon,
  BrainIcon,
  HeartIcon,
  KidneysIcon,
  LiverIcon,
  LungsIcon,
} from './organIcons';

export interface OrganDef {
  key: OrganKey;
  label: string;
  color: string;
  /** 버튼 위치 (실루엣 컨테이너 기준 %). 시계 방향 배치. */
  buttonPos: { top?: string; right?: string; bottom?: string; left?: string; transform?: string };
  /** 리더 라인 시작점(버튼 anchor). x/y는 SVG % 문자열. */
  anchor: { x: string; y: string };
  /** 리더 라인 끝점(실루엣 내부 장기 위치). */
  target: { x: string; y: string };
}

/**
 * 좌측 3 / 우측 3 두 컬럼으로 배치.
 * - anchor: 버튼 안쪽 가장자리 + 세로 중심.
 * - target: 실루엣 내부 해부학적 위치(전면 정면도, 이미지 우측 = 인체 좌측).
 */
export const ORGANS: OrganDef[] = [
  {
    key: 'cardio',
    label: '심혈관',
    color: '#E24B4A',
    buttonPos: { left: '0%', top: '10%' },
    anchor: { x: '14%', y: '22%' },
    target: { x: '52%', y: '50%' },
  },
  {
    key: 'hepatic',
    label: '간',
    color: '#EF9F27',
    buttonPos: { left: '0%', top: '40%' },
    anchor: { x: '14%', y: '52%' },
    target: { x: '46%', y: '58%' },
  },
  {
    key: 'coag',
    label: '응고계',
    color: '#D85A30',
    buttonPos: { left: '0%', top: '70%' },
    anchor: { x: '14%', y: '82%' },
    target: { x: '40%', y: '80%' },
  },
  {
    key: 'cns',
    label: 'CNS',
    color: '#7F77DD',
    buttonPos: { right: '0%', top: '10%' },
    anchor: { x: '86%', y: '22%' },
    target: { x: '50%', y: '14%' },
  },
  {
    key: 'resp',
    label: '호흡기',
    color: '#378ADD',
    buttonPos: { right: '0%', top: '40%' },
    anchor: { x: '86%', y: '52%' },
    target: { x: '57%', y: '46%' },
  },
  {
    key: 'renal',
    label: '신장',
    color: '#5DCAA5',
    buttonPos: { right: '0%', top: '70%' },
    anchor: { x: '86%', y: '82%' },
    target: { x: '55%', y: '70%' },
  },
];

export const ORGAN_KEYS: OrganKey[] = ORGANS.map((o) => o.key);

export function scoreToToneClass(score: number): 'safe' | 'warn' | 'danger' {
  if (score >= 3) return 'danger';
  if (score === 2) return 'warn';
  return 'safe';
}

/** OrganKey → 아이콘 컴포넌트 매핑 */
export const ORGAN_ICON: Record<OrganKey, ComponentType> = {
  cardio: HeartIcon,
  resp: LungsIcon,
  cns: BrainIcon,
  hepatic: LiverIcon,
  renal: KidneysIcon,
  coag: BloodCellsIcon,
};
