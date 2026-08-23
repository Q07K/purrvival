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
];

/** 일정 간격으로 등장하는 엘리트 */
export const ELITE: EnemyKind = {
  id: 'brute',
  hp: 700, speed: 44, damage: 26, radius: 26, xp: 60,
  elite: true, from: 0, weight: 0, cluster: 1,
};

/** 엘리트 등장 간격(초) */
export const ELITE_INTERVAL = 90;
