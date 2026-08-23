import type { Theme } from './types';

/* 적/투사체 key는 data/enemies.ts, data/weapons.ts 와 반드시 일치해야 한다. */

/**
 * 고양이 한 마리가 몰려오는 쥐떼를 상대한다.
 * ShapeSpec.size 는 표시 크기 기준이고, 적은 EnemyKind.radius 에 맞춰
 * 자동으로 다시 스케일되므로 여기 값은 "얼마나 세밀하게 그릴지" 에 가깝다.
 */
export const cats: Theme = {
  id: 'cats',
  label: '고양이 vs 쥐 (기본)',
  bg: 0x16131f,
  gridLine: 0x241f31,
  hudAccent: 0xffb347,

  /*
   * 고양이 팔레트도 캐릭터 디자인 시트("니티") 기준:
   *   몸통 #CFC7BA · 배/주둥이 #EADFCB · 귀 안쪽 #FFCFA3
   *   털실/코 #F6A3B1 · 줄무늬 #8E7D6D · 외곽선 #5E4B3C
   */
  player: {
    kind: 'cat',
    size: 56,
    bodyRatio: 0.56,
    fill: 0xcfc7ba,
    stroke: 0x5e4b3c,
    strokeWidth: 2,
    accent: 0xffcfa3,
    belly: 0xeadfcb,
    stripe: 0x8e7d6d,
    tail: 0xcfc7ba,
    item: 0xf6a3b1,
  },

  /*
   * 쥐는 전부 같은 drawMouse 를 쓰고 색과 크기만 다르다.
   * 팔레트는 캐릭터 디자인 시트("치지") 기준:
   *   몸통 #9E948B · 귀 안쪽/배 #F0E2C6 · 외곽선 #5A3E28 · 꼬리 #A67C52
   * bodyRatio 0.56 = drawMouse 의 몸통이 텍스처 박스에서 차지하는 가로 비율.
   */
  enemies: {
    // 시트 원본 배색 그대로
    grunt: {
      kind: 'mouse', size: 40, bodyRatio: 0.56, holdsItem: true,
      fill: 0x9e948b, stroke: 0x5a3e28, strokeWidth: 2, accent: 0xf0e2c6, tail: 0xa67c52,
    },
    // 떼로 몰려오는 작고 빠른 생쥐 — 밝게
    swarm: {
      kind: 'mouse', size: 32, bodyRatio: 0.56, holdsItem: true,
      fill: 0xbdb3a6, stroke: 0x6b4d33, strokeWidth: 2, accent: 0xf7ecd8, tail: 0xc0906a,
    },
    // 크고 단단한 시궁쥐 — 어둡고 차갑게
    tank: {
      kind: 'mouse', size: 60, bodyRatio: 0.56, holdsItem: true,
      fill: 0x6f7280, stroke: 0x33302f, strokeWidth: 3, accent: 0xd8d2c4, tail: 0x8a7259,
    },
    // 엘리트 — 쥐 두목. 붉은 윤곽선으로 위험 신호. 치즈를 챙겨 다닌다.
    brute: {
      kind: 'mouse', size: 90, bodyRatio: 0.56, holdsItem: true,
      fill: 0x4f3f3d, stroke: 0xc2413f, strokeWidth: 4, accent: 0xe0cdb6, tail: 0x9c4f3f,
    },
  },

  projectiles: {
    shard: { kind: 'yarn', size: 20, fill: 0xf6a3b1, stroke: 0x5e4b3c, strokeWidth: 2 },
    scatter: { kind: 'circle', size: 11, fill: 0xf9c77a, stroke: 0x7a5a3a, strokeWidth: 2 },
    orbit: { kind: 'ring', size: 22, fill: 0xff9ec4, stroke: 0xfff0f5, strokeWidth: 2, hole: 0.42 },
    aura: { kind: 'ring', size: 128, fill: 0xffb347, hole: 0.86 },
    tempest: { kind: 'yarn', size: 42, fill: 0xf6a3b1 },
    tornado: { kind: 'yarn', size: 54, fill: 0xf6a3b1 },
    barrier: { kind: 'ring', size: 128, fill: 0xffb347, hole: 0.86 },
    shower: { kind: 'yarn', size: 40, fill: 0xf6a3b1 },
  },

  // 치즈도 시트 팔레트 (#F9C77A / #D9B15B / #7A5A3A)
  gem: { kind: 'cheese', size: 14, fill: 0xf9c77a, stroke: 0x7a5a3a, strokeWidth: 1, accent: 0xd9b15b },
  gemBig: { kind: 'cheese', size: 22, fill: 0xf9c77a, stroke: 0x7a5a3a, strokeWidth: 2, accent: 0xd9b15b },
};

export const neon: Theme = {
  id: 'neon',
  label: '네온 (도형)',
  bg: 0x0b0b16,
  gridLine: 0x1b1b30,
  hudAccent: 0x4fd1ff,

  player: { kind: 'circle', size: 26, fill: 0x4fd1ff, stroke: 0xe8fbff, strokeWidth: 3 },

  enemies: {
    grunt: { kind: 'circle', size: 22, fill: 0xc2436b, stroke: 0x2a0a14, strokeWidth: 2 },
    swarm: { kind: 'triangle', size: 18, fill: 0xe9a13b, stroke: 0x30190a, strokeWidth: 2 },
    tank: { kind: 'rect', size: 34, fill: 0x7b5cd6, stroke: 0x1a1030, strokeWidth: 3 },
    brute: { kind: 'diamond', size: 52, fill: 0xff4d4d, stroke: 0xffe3a3, strokeWidth: 4 },
  },

  projectiles: {
    shard: { kind: 'diamond', size: 14, fill: 0xfff2b0, stroke: 0xffb830, strokeWidth: 2 },
    scatter: { kind: 'circle', size: 10, fill: 0x9dffb0, stroke: 0x1c5c2a, strokeWidth: 2 },
    orbit: { kind: 'ring', size: 22, fill: 0xb08bff, stroke: 0xf0e6ff, strokeWidth: 2, hole: 0.45 },
    aura: { kind: 'ring', size: 128, fill: 0x4fd1ff, hole: 0.86 },
    tempest: { kind: 'diamond', size: 32, fill: 0xff8cde }, tornado: { kind: 'ring', size: 48, fill: 0xff8cde, hole: 0.35 },
    barrier: { kind: 'ring', size: 128, fill: 0x4fd1ff, hole: 0.86 }, shower: { kind: 'diamond', size: 32, fill: 0xff8cde },
  },

  gem: { kind: 'diamond', size: 10, fill: 0x63f2c8, stroke: 0x0d4436, strokeWidth: 2 },
  gemBig: { kind: 'diamond', size: 16, fill: 0xffd75e, stroke: 0x5c3f00, strokeWidth: 2 },
};

export const forest: Theme = {
  id: 'forest',
  label: '숲 (도형)',
  bg: 0x121a12,
  gridLine: 0x1d2a1c,
  hudAccent: 0x9fe870,

  player: { kind: 'diamond', size: 26, fill: 0xf2e8c9, stroke: 0x5a4a24, strokeWidth: 3 },

  enemies: {
    grunt: { kind: 'rect', size: 22, fill: 0x6b8f3a, stroke: 0x1e2a10, strokeWidth: 2 },
    swarm: { kind: 'circle', size: 16, fill: 0xcfd85c, stroke: 0x33380f, strokeWidth: 2 },
    tank: { kind: 'circle', size: 36, fill: 0x4a6b8a, stroke: 0x111d26, strokeWidth: 3 },
    brute: { kind: 'star', size: 54, fill: 0xd97b3a, stroke: 0xfff0d0, strokeWidth: 4 },
  },

  projectiles: {
    shard: { kind: 'triangle', size: 14, fill: 0xf7f3d8, stroke: 0x7a6a2a, strokeWidth: 2 },
    scatter: { kind: 'diamond', size: 10, fill: 0xffc8a0, stroke: 0x6b3a1a, strokeWidth: 2 },
    orbit: { kind: 'circle', size: 18, fill: 0x9fe870, stroke: 0x22380f, strokeWidth: 2 },
    aura: { kind: 'ring', size: 128, fill: 0x9fe870, hole: 0.86 },
    tempest: { kind: 'triangle', size: 32, fill: 0xffb07c }, tornado: { kind: 'circle', size: 44, fill: 0xffb07c },
    barrier: { kind: 'ring', size: 128, fill: 0x9fe870, hole: 0.86 }, shower: { kind: 'triangle', size: 32, fill: 0xffb07c },
  },

  gem: { kind: 'circle', size: 10, fill: 0x7fd4ff, stroke: 0x0d3346, strokeWidth: 2 },
  gemBig: { kind: 'circle', size: 16, fill: 0xffd75e, stroke: 0x5c3f00, strokeWidth: 2 },
};

/** 첫 번째가 기본 테마 */
export const THEMES: Theme[] = [cats, neon, forest];

export function themeById(id: string | null): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
