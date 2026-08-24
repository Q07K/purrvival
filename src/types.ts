import type Phaser from 'phaser';

/* ------------------------------------------------------------------ */
/* 풀링 공통                                                            */
/* ------------------------------------------------------------------ */

export interface Poolable {
  active: boolean;
  /** 풀 배열에서의 고정 인덱스 */
  index: number;
}

/* ------------------------------------------------------------------ */
/* 엔티티                                                               */
/* ------------------------------------------------------------------ */

export interface Enemy extends Poolable {
  /** 재사용되는 index와 달리 절대 겹치지 않는 식별자. 관통 중복 히트 방지용 */
  uid: number;
  kind: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  /** 무기 슬롯별 다음 히트 가능 시각(ms). 지속 딜 무기의 틱 제어 */
  hitAt: Float64Array;
  knockX: number;
  knockY: number;
  flash: number;
  elite: boolean;
  boss: boolean;
  sprite: Phaser.GameObjects.Image;
}

export interface Projectile extends Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  /** 남은 관통 횟수 */
  pierce: number;
  /** 남은 수명(초) */
  life: number;
  slot: number;
  knockback: number;
  hitUids: number[];
  /** 어느 무기의 투사체인지 — 테마 교체 시 텍스처를 되돌리는 데 쓴다 */
  tex: string;
  sprite: Phaser.GameObjects.Image;
}

export interface Gem extends Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  xp: number;
  attracted: boolean;
  /** 큰 젬(엘리트 드랍) 여부 */
  big: boolean;
  /** 낮은 확률로 떨어지는 체력 회복 아이템 */
  heal: boolean;
  sprite: Phaser.GameObjects.Image;
}

/* ------------------------------------------------------------------ */
/* 플레이어                                                             */
/* ------------------------------------------------------------------ */

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNext: number;
  invuln: number;
  /* 패시브가 곱해지는 최종 스탯 */
  speed: number;
  damageMult: number;
  cooldownMult: number;
  areaMult: number;
  xpMult: number;
  projectileSpeedMult: number;
  auraCooldownMult: number;
  orbitSpeedMult: number;
  magnet: number;
  armor: number;
}

/* ------------------------------------------------------------------ */
/* 무기 / 패시브                                                        */
/* ------------------------------------------------------------------ */

export type WeaponBehavior = 'projectile' | 'spread' | 'orbit' | 'aura' | 'rain';

export interface WeaponStats {
  /** 발사 간격(ms) */
  cooldown: number;
  damage: number;
  /** 투사체/궤도체 개수 */
  count: number;
  speed: number;
  pierce: number;
  /** 유효 반경(px) — aura/orbit의 사거리, projectile의 히트박스 */
  area: number;
  /** 투사체 수명(초) */
  life: number;
  knockback: number;
  /** 콜라보 재조합으로 오른 중첩 단계 */
  stacks?: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  desc: string;
  behavior: WeaponBehavior;
  tex: string;
  maxLevel: number;
  stats: (level: number) => WeaponStats;
  /** 다음 레벨에서 뭐가 좋아지는지 한 줄 설명 */
  note: (nextLevel: number) => string;
}

export interface OwnedWeapon {
  def: WeaponDef;
  level: number;
  slot: number;
  /** 다음 발사 시각(ms) */
  nextAt: number;
  /** orbit 전용 누적 각도 */
  phase: number;
  /** 콜라보는 재조합할 때마다 최대 5회까지 중첩된다. */
  stacks: number;
}

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  tex: string;
  maxLevel: number;
  note: (nextLevel: number) => string;
}

/* ------------------------------------------------------------------ */
/* 레벨업 선택지                                                         */
/* ------------------------------------------------------------------ */

export type ChoiceKind = 'weapon-new' | 'weapon-up' | 'passive' | 'collab';

export interface Choice {
  kind: ChoiceKind;
  id: string;
  name: string;
  detail: string;
  level: number;
  maxLevel: number;
  tex?: string;
}

export interface HudStats {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNext: number;
  time: number;
  kills: number;
  enemies: number;
}

export interface GameOverStats {
  time: number;
  kills: number;
  level: number;
  gold: number;
  cleared?: boolean;
}

/** 일시정지 화면에 보여줄 현재 빌드 */
export interface Loadout {
  weapons: { name: string; level: number; maxLevel: number; stacks: number; isCollab: boolean; tex: string }[];
  passives: { name: string; level: number }[];
}

export interface PauseStats extends GameOverStats {
  hp: number;
  maxHp: number;
  loadout: Loadout;
}
