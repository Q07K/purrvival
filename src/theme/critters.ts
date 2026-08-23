import Phaser from 'phaser';
import type { ShapeSpec } from './types';

/**
 * 캐릭터 도형.
 *
 * 원시 도형(원/사각형)만으로는 "고양이"와 "쥐"가 안 나오므로
 * 코드로 그리는 스프라이트를 따로 둔다. 좌표는 전부 0~1 정규화라
 * 텍스처 크기를 바꿔도 비율이 유지된다.
 *
 * 고양이(니티)와 쥐(치지) 모두 캐릭터 디자인 시트를 따랐다.
 * 두 캐릭터는 같은 몸통 실루엣(pearBody)을 공유하고,
 * 귀 모양 / 꼬리 / 줄무늬 / 들고 있는 아이템으로 구분한다.
 *
 * 실제 아트가 준비되면 Theme.images 로 PNG 를 꽂으면 이 코드는 그냥 안 쓰인다.
 */

type G = Phaser.GameObjects.Graphics;
interface P {
  x: number;
  y: number;
}

/** 정규화 좌표 -> 픽셀 Point */
const pt = (s: number, x: number, y: number) => new Phaser.Geom.Point(x * s, y * s);

/** 시트 공통 중심점. */
const BODY = { cx: 0.39 };

/** 3차 베지어를 잘게 쪼갠 점들. 꼬리를 부드럽게 잇는 데 쓴다. */
function bezier(p0: P, p1: P, p2: P, p3: P, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    out.push({
      x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
      y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
    });
  }
  return out;
}

function strokeCurve(g: G, s: number, pts: P[], width: number, color: number) {
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.moveTo(pts[0].x * s, pts[0].y * s);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x * s, pts[i].y * s);
  g.strokePath();
}

/** 꼬리 곡선 — 몸 오른쪽 아래에서 시작해 크게 휘어 올라간다 */
const TAIL = bezier(
  { x: 0.55, y: 0.79 },
  { x: 0.84, y: 0.97 },
  { x: 1.0, y: 0.78 },
  { x: 0.9, y: 0.45 },
  18,
);

/** 시트의 큰 둥근 머리 + 작은 몸통 비율. */
function chibiBody(g: G, s: number, fill: number, line: number, lw: number) {
  g.fillStyle(fill, 1);
  g.lineStyle(lw, line, 1);
  g.fillEllipse(BODY.cx * s, 0.66 * s, 0.42 * s, 0.50 * s);
  g.strokeEllipse(BODY.cx * s, 0.66 * s, 0.42 * s, 0.50 * s);
}

function chibiHead(g: G, s: number, fill: number, line: number, lw: number) {
  g.fillStyle(fill, 1);
  g.lineStyle(lw, line, 1);
  g.fillEllipse(BODY.cx * s, 0.34 * s, 0.52 * s, 0.43 * s);
  g.strokeEllipse(BODY.cx * s, 0.34 * s, 0.52 * s, 0.43 * s);
}

/* ------------------------------------------------------------------ */
/* 고양이 (니티) — 플레이어                                             */
/* ------------------------------------------------------------------ */

/**
 * 시트의 특징: 뾰족한 삼각 귀 + 복숭아색 귀 안쪽 / 태비 줄무늬 /
 * 줄무늬가 있는 긴 꼬리 / 분홍 털실을 안고 있음.
 *
 * 쥐와 구분되는 지점은 "뾰족한 귀" 와 "분홍 털실" 두 가지다.
 * 몸통 색이 쥐와 비슷한 웜그레이라 이 두 신호가 가독성을 책임진다.
 */
export function drawCat(g: G, s: number, spec: ShapeSpec, walk = 0) {
  const fill = spec.fill;
  const line = spec.stroke ?? 0x5e4b3c;
  const lw = (spec.strokeWidth ?? 2) * (s / spec.size);
  const ear = spec.accent ?? 0xffcfa3;
  const belly = spec.belly ?? 0xeadfcb;
  const stripe = spec.stripe ?? 0x8e7d6d;
  const tailC = spec.tail ?? fill;
  const yarn = spec.item ?? 0xf6a3b1;
  const CX = BODY.cx;
  const step = walk === 0 ? 0.035 : -0.035;

  // --- 꼬리: 굵은 외곽선을 먼저 깔고 그 위에 몸색을 덧그려 테두리를 만든다
  const outerW = lw * 3.4;
  const innerW = outerW - lw * 1.8;
  strokeCurve(g, s, TAIL, outerW, line);
  strokeCurve(g, s, TAIL, innerW, tailC);
  // 꼬리 줄무늬
  for (const i of [4, 8, 12]) {
    strokeCurve(g, s, [TAIL[i], TAIL[i + 1]], innerW, stripe);
  }

  // 뒷다리. 몸통 뒤에 먼저 두면 걷는 동안 다리만 자연스럽게 교차한다.
  g.fillStyle(fill, 1);
  g.lineStyle(lw, line, 1);
  g.fillEllipse(0.265 * s, (0.855 + step) * s, 0.13 * s, 0.19 * s);
  g.strokeEllipse(0.265 * s, (0.855 + step) * s, 0.13 * s, 0.19 * s);
  g.fillEllipse(0.50 * s, (0.855 - step) * s, 0.13 * s, 0.19 * s);
  g.strokeEllipse(0.50 * s, (0.855 - step) * s, 0.13 * s, 0.19 * s);

  // --- 뾰족한 귀 (쥐의 동그란 귀와 대비되는 핵심 실루엣)
  const earL = [pt(s, 0.145, 0.34), pt(s, 0.185, 0.015), pt(s, 0.375, 0.215)];
  const earR = [pt(s, 0.635, 0.34), pt(s, 0.595, 0.015), pt(s, 0.405, 0.215)];
  g.fillStyle(fill, 1);
  g.lineStyle(lw, line, 1);
  g.fillPoints(earL, true);
  g.strokePoints(earL, true, true);
  g.fillPoints(earR, true);
  g.strokePoints(earR, true, true);
  g.fillStyle(ear, 1);
  g.fillPoints([pt(s, 0.20, 0.29), pt(s, 0.225, 0.10), pt(s, 0.345, 0.235)], true);
  g.fillPoints([pt(s, 0.58, 0.29), pt(s, 0.555, 0.10), pt(s, 0.435, 0.235)], true);

  // --- 시트처럼 작은 몸통 위에 큰 둥근 머리를 얹는다.
  chibiBody(g, s, fill, line, lw);
  chibiHead(g, s, fill, line, lw);

  // --- 태비 줄무늬 (이마 3줄 + 옆구리)
  g.lineStyle(lw * 1.4, stripe, 1);
  g.lineBetween(0.285 * s, 0.255 * s, 0.335 * s, 0.235 * s);
  g.lineBetween(0.365 * s, 0.222 * s, 0.425 * s, 0.222 * s);
  g.lineBetween(0.455 * s, 0.235 * s, 0.505 * s, 0.255 * s);
  g.lineBetween(0.155 * s, 0.545 * s, 0.215 * s, 0.525 * s);
  g.lineBetween(0.565 * s, 0.525 * s, 0.625 * s, 0.545 * s);

  // --- 밝은 주둥이
  g.fillStyle(belly, 1);
  g.fillEllipse(CX * s, 0.405 * s, 0.235 * s, 0.145 * s);

  // --- 털실 + 앞발 (캐릭터 아이덴티티. 쥐에는 없는 분홍색)
  // 풀린 실은 몸통 실루엣 바깥(왼쪽 아래)으로 빼야 보인다.
  // 몸 뒤로 지나가게 두면 분홍 덩어리로만 보인다.
  const string = bezier(
    { x: 0.27, y: 0.80 },
    { x: 0.17, y: 0.93 },
    { x: 0.08, y: 0.95 },
    { x: 0.02, y: 0.86 },
    12,
  );
  strokeCurve(g, s, string, Math.max(1, lw * 0.8), yarn);

  g.fillStyle(yarn, 1);
  g.lineStyle(lw, line, 1);
  g.fillCircle(CX * s, 0.685 * s, 0.155 * s);
  g.strokeCircle(CX * s, 0.685 * s, 0.155 * s);
  g.lineStyle(Math.max(1, lw * 0.6), line, 0.55);
  g.lineBetween(0.275 * s, 0.62 * s, 0.475 * s, 0.735 * s);
  g.lineBetween(0.29 * s, 0.755 * s, 0.475 * s, 0.635 * s);

  g.fillStyle(fill, 1);
  g.lineStyle(lw, line, 1);
  g.fillCircle(0.215 * s, 0.705 * s, 0.062 * s);
  g.strokeCircle(0.215 * s, 0.705 * s, 0.062 * s);
  g.fillCircle(0.565 * s, 0.705 * s, 0.062 * s);
  g.strokeCircle(0.565 * s, 0.705 * s, 0.062 * s);

  // 앞발은 털실 아래에서 살짝 보이게. 한쪽씩 번갈아 올라가 걷는 리듬을 만든다.
  g.fillEllipse(0.245 * s, (0.79 - step) * s, 0.12 * s, 0.10 * s);
  g.strokeEllipse(0.245 * s, (0.79 - step) * s, 0.12 * s, 0.10 * s);
  g.fillEllipse(0.535 * s, (0.79 + step) * s, 0.12 * s, 0.10 * s);
  g.strokeEllipse(0.535 * s, (0.79 + step) * s, 0.12 * s, 0.10 * s);

  // --- 수염
  // 시트는 밝은 배경이라 갈색 수염이 보이지만, 게임 배경은 어둡다.
  // 어두운 색으로 그리면 통째로 사라지므로 밝은 색으로 뽑는다.
  g.lineStyle(Math.max(1, lw * 0.55), belly, 0.9);
  g.lineBetween(0.29 * s, 0.375 * s, 0.105 * s, 0.335 * s);
  g.lineBetween(0.29 * s, 0.425 * s, 0.11 * s, 0.46 * s);
  g.lineBetween(0.49 * s, 0.375 * s, 0.675 * s, 0.335 * s);
  g.lineBetween(0.49 * s, 0.425 * s, 0.67 * s, 0.46 * s);

  // --- 얼굴
  g.fillStyle(0x000000, 1);
  g.fillCircle(0.315 * s, 0.325 * s, 0.04 * s);
  g.fillCircle(0.465 * s, 0.325 * s, 0.04 * s);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(0.302 * s, 0.312 * s, 0.012 * s);
  g.fillCircle(0.452 * s, 0.312 * s, 0.012 * s);
  g.fillStyle(yarn, 1);
  g.fillPoints(
    [pt(s, 0.365, 0.375), pt(s, 0.415, 0.375), pt(s, CX, 0.408)],
    true,
  );
}

/* ------------------------------------------------------------------ */
/* 쥐 (치지) — 몰려오는 적                                              */
/* ------------------------------------------------------------------ */

/**
 * 시트의 특징: 동그란 큰 귀 / 서 있는 서양배형 몸통 / 길게 휘는 꼬리 /
 * 밝은 배 패치 / 점 두 개 눈. 디자인 노트대로 실루엣을 단순하게 유지한다.
 *
 * 몸통은 x 0.11~0.67 을 차지하고 꼬리가 0.96 까지 뻗는다.
 * 이 비율이 ShapeSpec.bodyRatio 와 맞아야 히트박스와 보이는 크기가 일치한다.
 */
export function drawMouse(g: G, s: number, spec: ShapeSpec, walk = 0) {
  const fill = spec.fill;
  const line = spec.stroke ?? 0x5a3e28;
  const lw = (spec.strokeWidth ?? 2) * (s / spec.size);
  const accent = spec.accent ?? 0xf0e2c6;
  const belly = spec.belly ?? accent;
  const tail = spec.tail ?? line;
  const CX = BODY.cx;
  const step = walk === 0 ? 0.035 : -0.035;

  // 꼬리 — 고양이와 같은 곡선이지만 가늘고 테두리가 없다
  strokeCurve(g, s, TAIL, lw * 1.6, tail);

  // 뒷다리: 달리는 쥐가 한 덩어리로 보이지 않도록 몸통보다 먼저 그린다.
  g.fillStyle(fill, 1);
  g.lineStyle(lw, line, 1);
  g.fillEllipse(0.255 * s, (0.86 + step) * s, 0.125 * s, 0.17 * s);
  g.strokeEllipse(0.255 * s, (0.86 + step) * s, 0.125 * s, 0.17 * s);
  g.fillEllipse(0.51 * s, (0.86 - step) * s, 0.125 * s, 0.17 * s);
  g.strokeEllipse(0.51 * s, (0.86 - step) * s, 0.125 * s, 0.17 * s);

  // 둥근 귀 (몸통이 밑동을 덮도록 먼저)
  g.fillStyle(fill, 1);
  g.lineStyle(lw, line, 1);
  g.fillCircle(0.235 * s, 0.175 * s, 0.155 * s);
  g.strokeCircle(0.235 * s, 0.175 * s, 0.155 * s);
  g.fillCircle(0.545 * s, 0.175 * s, 0.155 * s);
  g.strokeCircle(0.545 * s, 0.175 * s, 0.155 * s);
  g.fillStyle(accent, 1);
  g.fillCircle(0.235 * s, 0.185 * s, 0.088 * s);
  g.fillCircle(0.545 * s, 0.185 * s, 0.088 * s);

  // 시트의 큰 둥근 머리 + 작은 몸통. 멀리서도 얼굴이 먼저 읽힌다.
  chibiBody(g, s, fill, line, lw);
  chibiHead(g, s, fill, line, lw);

  // 밝은 배 패치 — 몸통 색이 살아 있도록 작게. 크게 잡으면 쥐가 흰 덩어리로 보인다.
  g.fillStyle(belly, 1);
  g.fillEllipse(CX * s, 0.675 * s, 0.225 * s, 0.27 * s);

  if (spec.holdsItem) {
    // 치즈를 안고 있는 모습
    const wedge = [pt(s, 0.25, 0.74), pt(s, 0.54, 0.74), pt(s, 0.40, 0.50)];
    g.fillStyle(0xf9c77a, 1);
    g.fillPoints(wedge, true);
    g.lineStyle(lw * 0.9, 0x7a5a3a, 1);
    g.strokePoints(wedge, true, true);
    g.fillStyle(0xd9b15b, 1);
    g.fillCircle(0.38 * s, 0.665 * s, 0.032 * s);
    g.fillCircle(0.46 * s, 0.695 * s, 0.024 * s);
    g.fillStyle(fill, 1);
    g.lineStyle(lw, line, 1);
    g.fillCircle(0.225 * s, 0.72 * s, 0.058 * s);
    g.strokeCircle(0.225 * s, 0.72 * s, 0.058 * s);
    g.fillCircle(0.565 * s, 0.72 * s, 0.058 * s);
    g.strokeCircle(0.565 * s, 0.72 * s, 0.058 * s);
  }

  // 수염
  g.lineStyle(Math.max(1, lw * 0.5), line, 0.75);
  g.lineBetween(0.30 * s, 0.40 * s, 0.13 * s, 0.36 * s);
  g.lineBetween(0.30 * s, 0.44 * s, 0.14 * s, 0.47 * s);
  g.lineBetween(0.48 * s, 0.40 * s, 0.65 * s, 0.36 * s);
  g.lineBetween(0.48 * s, 0.44 * s, 0.64 * s, 0.47 * s);

  // 눈 — 점 두 개
  g.fillStyle(0x000000, 1);
  g.fillCircle(0.315 * s, 0.325 * s, 0.037 * s);
  g.fillCircle(0.465 * s, 0.325 * s, 0.037 * s);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(0.303 * s, 0.313 * s, 0.011 * s);
  g.fillCircle(0.453 * s, 0.313 * s, 0.011 * s);

  // 코
  g.fillStyle(line, 1);
  g.fillCircle(CX * s, 0.415 * s, 0.028 * s);
}

/* ------------------------------------------------------------------ */
/* 소품                                                                 */
/* ------------------------------------------------------------------ */

/** 치즈 조각 — 경험치 젬 */
export function drawCheese(g: G, s: number, spec: ShapeSpec) {
  const line = spec.stroke ?? 0x000000;
  const lw = (spec.strokeWidth ?? 1) * (s / spec.size);

  const wedge = [pt(s, 0.06, 0.80), pt(s, 0.94, 0.80), pt(s, 0.5, 0.14)];
  g.fillStyle(spec.fill, 1);
  g.fillPoints(wedge, true);
  if (lw > 0) {
    g.lineStyle(lw, line, 1);
    g.strokePoints(wedge, true, true);
  }

  g.fillStyle(spec.accent ?? line, spec.accent !== undefined ? 1 : 0.4);
  g.fillCircle(0.37 * s, 0.63 * s, 0.085 * s);
  g.fillCircle(0.62 * s, 0.68 * s, 0.06 * s);
  g.fillCircle(0.52 * s, 0.42 * s, 0.055 * s);
}

/** 발톱 자국 — 투사체 */
export function drawClaw(g: G, s: number, spec: ShapeSpec) {
  const line = spec.stroke ?? 0x000000;
  const lw = (spec.strokeWidth ?? 2) * (s / spec.size);
  const blade = [pt(s, 0.5, 0.02), pt(s, 0.74, 0.60), pt(s, 0.5, 0.98), pt(s, 0.26, 0.60)];
  g.fillStyle(spec.fill, 1);
  g.fillPoints(blade, true);
  if (lw > 0) {
    g.lineStyle(lw, line, 1);
    g.strokePoints(blade, true, true);
  }
}

/** 분홍 털실 뭉치 — 고양이 기본 공격 투사체 */
export function drawYarn(g: G, s: number, spec: ShapeSpec) {
  const yarn = spec.fill;
  const line = spec.stroke ?? 0x5e4b3c;
  const lw = (spec.strokeWidth ?? 2) * (s / spec.size);
  const c = s / 2;
  const r = s * 0.39;

  g.fillStyle(yarn, 1);
  g.lineStyle(lw, line, 1);
  g.fillCircle(c, c, r);
  g.strokeCircle(c, c, r);
  g.lineStyle(Math.max(1, lw * 0.75), 0xd56c88, 0.9);
  g.beginPath();
  g.arc(c, c, r * 0.67, -2.6, 0.55, false);
  g.strokePath();
  g.beginPath();
  g.arc(c, c, r * 0.45, 0.45, 3.75, false);
  g.strokePath();
  g.fillStyle(0xffd5df, 0.9);
  g.fillCircle(c - r * 0.28, c - r * 0.28, r * 0.14);
}
