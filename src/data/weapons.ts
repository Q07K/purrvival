import type { WeaponDef } from '../types';

/**
 * 무기 스탯은 레벨을 받아 계산하는 함수로 정의한다.
 * 레벨별 테이블을 손으로 32줄 적는 것보다 밸런싱이 훨씬 빠르다.
 */
export const WEAPONS: WeaponDef[] = [
  {
    id: 'shard',
    name: '털실 뭉치',
    desc: '들고 있던 털실 뭉치를 가장 가까운 적에게 던진다.',
    behavior: 'projectile',
    tex: 'shard',
    maxLevel: 8,
    stats: (l) => ({
      cooldown: 800 * Math.pow(0.92, l - 1),
      damage: 14 + 5 * (l - 1),
      count: 1 + Math.floor((l - 1) / 2),
      speed: 430 + 14 * (l - 1),
      pierce: 1 + Math.floor((l - 1) / 3),
      area: 8,
      life: 1.6,
      knockback: 90,
    }),
    note: (n) =>
      n % 2 === 1 ? `투사체 +1 · 피해 +5` : n % 3 === 1 ? `관통 +1 · 피해 +5` : `피해 +5 · 쿨다운 -8%`,
  },
  {
    id: 'scatter',
    name: '스캐터',
    desc: '진행 방향으로 부채꼴 탄막을 뿌린다.',
    behavior: 'spread',
    tex: 'scatter',
    maxLevel: 8,
    stats: (l) => ({
      cooldown: 1350 * Math.pow(0.94, l - 1),
      damage: 7 + 3 * (l - 1),
      count: 3 + Math.floor((l - 1) / 1.5),
      speed: 330,
      pierce: 1,
      area: 7,
      life: 0.85,
      knockback: 60,
    }),
    note: () => `탄 수 증가 · 피해 +3 · 쿨다운 -6%`,
  },
  {
    id: 'orbit',
    name: '오빗',
    desc: '주변을 도는 궤도체가 닿는 적을 계속 때린다.',
    behavior: 'orbit',
    tex: 'orbit',
    maxLevel: 8,
    stats: (l) => ({
      /** orbit 은 "적 1마리당 재히트 간격" 으로 쓰인다 */
      cooldown: 620 * Math.pow(0.95, l - 1),
      damage: 9 + 4 * (l - 1),
      count: 2 + Math.floor(l / 2),
      /** 회전 각속도(도/초) */
      speed: 130 + 6 * (l - 1),
      pierce: 0,
      area: 74 + 5 * (l - 1),
      life: 0,
      knockback: 40,
    }),
    note: (n) => (n % 2 === 0 ? `궤도체 +1 · 피해 +4` : `반경 +5 · 피해 +4`),
  },
  {
    id: 'aura',
    name: '펄스',
    desc: '몸 주위에 지속 피해 장판을 두른다.',
    behavior: 'aura',
    tex: 'aura',
    maxLevel: 8,
    stats: (l) => ({
      /** 틱 간격 */
      cooldown: 700 * Math.pow(0.93, l - 1),
      damage: 6 + 3 * (l - 1),
      count: 1,
      speed: 0,
      pierce: 0,
      area: 62 + 8 * (l - 1),
      life: 0,
      knockback: 130,
    }),
    note: () => `반경 +8 · 피해 +3 · 틱 속도 +7%`,
  },
];

export const COLLABS: (WeaponDef & { ingredients: [string, string] })[] = [
  {
    id: 'tempest', name: '털실 폭풍', desc: '추적 털실을 폭풍처럼 부채꼴로 쏟아낸다.',
    ingredients: ['shard', 'scatter'], behavior: 'spread', tex: 'tempest', maxLevel: 1,
    stats: () => ({ cooldown: 450, damage: 36, count: 13, speed: 560, pierce: 4, area: 14, life: 1.5, knockback: 130 }),
    note: () => '최종 진화형',
  },
  {
    id: 'tornado', name: '핑크 토네이도', desc: '거대 털실 회오리가 주위를 고속으로 휩쓴다.',
    ingredients: ['shard', 'orbit'], behavior: 'orbit', tex: 'tornado', maxLevel: 1,
    stats: () => ({ cooldown: 190, damage: 48, count: 5, speed: 300, pierce: 0, area: 124, life: 0, knockback: 150 }),
    note: () => '최종 진화형',
  },
  {
    id: 'barrier', name: '포근한 결계', desc: '넓은 털실 결계가 주변 쥐에게 지속 피해를 준다.',
    ingredients: ['orbit', 'aura'], behavior: 'aura', tex: 'barrier', maxLevel: 1,
    stats: () => ({ cooldown: 220, damage: 40, count: 1, speed: 0, pierce: 0, area: 158, life: 0, knockback: 190 }),
    note: () => '최종 진화형',
  },
  {
    id: 'shower', name: '털실 소나기', desc: '고양이 주변으로 털실 비를 퍼붓는다.',
    ingredients: ['scatter', 'aura'], behavior: 'rain', tex: 'shower', maxLevel: 1,
    stats: () => ({ cooldown: 420, damage: 38, count: 14, speed: 650, pierce: 4, area: 18, life: 0.8, knockback: 130 }),
    note: () => '최종 진화형',
  },
];

export const WEAPON_BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));
export const COLLAB_BY_ID = new Map(COLLABS.map((w) => [w.id, w]));

/** 시작 무기 */
export const STARTING_WEAPON = 'shard';
