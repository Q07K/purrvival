/** 게임 전역 튜닝 상수. 밸런싱은 여기서부터 만지면 된다. */

export const VIEW = { width: 960, height: 540 };

/** 현재 게임 논리 화면 크기. Phaser RESIZE 이벤트에서 한 번만 갱신한다. */
export function setViewSize(width: number, height: number) {
  VIEW.width = Math.max(1, Math.round(width));
  VIEW.height = Math.max(1, Math.round(height));
}

/** 공간 해시 셀 크기(px). 적 반지름 평균의 3~4배가 대체로 최적. */
export const CELL_SIZE = 64;

/** 동시 존재 상한 — 넘으면 스폰을 멈춘다. */
export const MAX_ENEMIES = 900;
export const MAX_PROJECTILES = 600;
export const MAX_GEMS = 900;

/** 20분 최종 보스, 이후 선택형 오버타임은 25분부터 강화된다. */
export const FINAL_BOSS_TIME = 20 * 60;
export const OVERTIME_TIME = 25 * 60;

/** 플레이어에서 이 거리보다 멀어진 적은 회수해서 재사용한다. */
export const DESPAWN_RADIUS = 1400;

export const PLAYER = {
  baseSpeed: 190,
  maxHp: 100,
  radius: 14,
  /** 피격 후 무적 시간(초) */
  invulnTime: 0.5,
  /** 젬 흡수 시작 반경 */
  magnet: 110,
  pickupRadius: 16,
};

export const KNOCKBACK_DECAY = 12;

/** 경험치 젬 흡수 */
export const GEM = {
  /** 흡수 시작 후 가속도 (px/s^2) */
  pullAccel: 1200,
  /**
   * 최대 흡수 속도 (px/s).
   * 플레이어 최고 속도(경보 만렙 285)보다 충분히 빨라야 도망가도 따라잡는다.
   */
  pullMax: 1000,
};

/** 무기 슬롯 / 패시브 슬롯 상한 */
export const MAX_WEAPON_SLOTS = 6;
export const MAX_PASSIVE_SLOTS = 6;

/** 레벨 N에서 N+1로 가는 데 필요한 경험치 */
export function xpForLevel(level: number): number {
  return Math.floor(8 * Math.pow(level, 1.32)) + 5;
}

/** 경과 시간(초)에 따른 적 능력치 배율 */
export function difficultyScale(t: number) {
  return {
    hp: 1 + (t / 60) * 0.35 + Math.pow(t / 240, 2) * 1.0,
    speed: 1 + (t / 60) * 0.04,
    /** 초당 스폰 "마릿수". 무리(cluster)로 나오는 적은 그만큼 예산을 더 쓴다. */
    rate: 1.4 + (t / 60) * 1.8,
  };
}
