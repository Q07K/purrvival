import type { PassiveDef } from '../types';

export const PASSIVES: PassiveDef[] = [
  { id: 'might',   name: '완력', desc: '모든 피해 +12%',        tex: 'skill:might', maxLevel: 5, note: () => '피해 +12%' },
  { id: 'haste',   name: '신속', desc: '무기 쿨다운 -8%',       tex: 'skill:haste', maxLevel: 5, note: () => '쿨다운 -8%' },
  { id: 'boots',   name: '경보', desc: '이동 속도 +10%',        tex: 'skill:boots', maxLevel: 5, note: () => '이동 속도 +10%' },
  { id: 'magnet',  name: '자력', desc: '경험치 흡수 범위 +25%', tex: 'skill:magnet', maxLevel: 5, note: () => '흡수 범위 +25%' },
  { id: 'armor',   name: '방어', desc: '피격 피해 -2 (최소 1)', tex: 'skill:armor', maxLevel: 5, note: () => '피격 피해 -2' },
  { id: 'vitality',name: '활력', desc: '최대 체력 +25, 즉시 회복', tex: 'skill:vitality', maxLevel: 5, note: () => '최대 체력 +25' },
  { id: 'area',    name: '확산', desc: '무기 범위·투사체 사거리 +10%', tex: 'skill:area', maxLevel: 5, note: () => '범위·사거리 +10%' },
];

export const PASSIVE_BY_ID = new Map(PASSIVES.map((p) => [p.id, p]));
