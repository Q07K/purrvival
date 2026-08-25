export interface EnemyKind {
  id: string;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  elite: boolean;
  /** 이 시각(초) 이후부터 등장 */
  from: number;
  /** 스폰 가중치 */
  weight: number;
  /** 한 번에 뭉쳐 나오는 수 */
  cluster: number;
}

export const ENEMY_KINDS: EnemyKind[] = [
  {
    id: 'grunt',
    hp: 12, speed: 52, damage: 8, radius: 11, xp: 1,
    elite: false, from: 0, weight: 100, cluster: 1,
  },
  {
    id: 'swarm',
    hp: 6, speed: 96, damage: 5, radius: 9, xp: 1,
    elite: false, from: 45, weight: 70, cluster: 6,
  },
  {
    id: 'tank',
    hp: 70, speed: 34, damage: 16, radius: 17, xp: 4,
    elite: false, from: 100, weight: 34, cluster: 1,
  },
  {
    id: 'charger',
    hp: 110, speed: 76, damage: 22, radius: 26, xp: 8,
    elite: false, from: 1800, weight: 18, cluster: 1,
  },
  {
    id: 'slinger',
    hp: 52, speed: 58, damage: 15, radius: 15, xp: 5,
    elite: false, from: 1800, weight: 22, cluster: 1,
  },
];

/** 일정 간격으로 등장하는 엘리트 */
export const ELITE: EnemyKind = {
  id: 'brute',
  hp: 700, speed: 44, damage: 26, radius: 26, xp: 60,
  elite: true, from: 0, weight: 0, cluster: 1,
};

/** 굴 붕괴에서만 나오는 대형 돌격 쥐. 보상 몹이 아니라 피해야 할 파도다. */
export const BURROW_RAIDER: EnemyKind = {
  id: 'burrow', hp: 48, speed: 78, damage: 14, radius: 26, xp: 1,
  elite: false, from: 0, weight: 0, cluster: 1,
};

/** 20분 완주를 막는 쥐 군주 — 기존 엘리트 텍스처를 크게 재사용한다. */
export const FINAL_BOSS: EnemyKind = {
  ...ELITE, hp: 3000, speed: 42, damage: 48, radius: 48, xp: 300,
};

/** 엘리트 등장 간격(초) */
export const ELITE_INTERVAL = 90;
