import Phaser from 'phaser';
import { drawCat, drawCheese, drawClaw, drawMouse, drawYarn } from './critters';
import type { ShapeSpec, Theme } from './types';
import { selectedCharacter } from '../data/characters';

/**
 * 텍스처 키 규칙 — 게임 코드는 오직 이 키만 참조한다.
 * 따라서 아트를 교체해도 게임 로직은 한 줄도 바뀌지 않는다.
 */
export const TEX = {
  player: 'tex:player',
  playerWalk: (frame: number) => `tex:player:walk:${frame}`,
  enemy: (kind: string) => `tex:enemy:${kind}`,
  enemyWalk: (kind: string, frame: number) => `tex:enemy:${kind}:walk:${frame}`,
  proj: (id: string) => `tex:proj:${id}`,
  gem: 'tex:gem',
  gemBig: 'tex:gemBig',
  gemSmall: 'tex:gem:small',
  gemMedium: 'tex:gem:medium',
  gemLarge: 'tex:gem:large',
  gemBoss: 'tex:gem:boss',
  heal: 'tex:heal',
  ground: 'tex:ground',
  auraRange: 'tex:aura-range',
  pixel: 'tex:pixel',
} as const;

/**
 * 슈퍼샘플링 배율.
 * 26px 짜리 고양이 얼굴을 그대로 그리면 눈·수염이 1px 이라 뭉개진다.
 * 2배로 그린 뒤 표시할 때 줄이면 훨씬 깔끔하다.
 * 표시 크기는 GameScene.scaleTo() 가 텍스처 실제 폭을 보고 맞춘다.
 */
export const SUPERSAMPLE = 2;

function drawShape(g: Phaser.GameObjects.Graphics, spec: ShapeSpec, s: number, walk = 0) {
  const c = s / 2;
  const sw = (spec.strokeWidth ?? 0) * (s / spec.size);
  const r = c - sw / 2;

  g.fillStyle(spec.fill, 1);
  if (sw > 0 && spec.stroke !== undefined) g.lineStyle(sw, spec.stroke, 1);

  switch (spec.kind) {
    case 'cat':
      drawCat(g, s, spec, walk);
      break;

    case 'mouse':
      drawMouse(g, s, spec, walk);
      break;

    case 'cheese':
      drawCheese(g, s, spec);
      break;

    case 'claw':
      drawClaw(g, s, spec);
      break;

    case 'yarn':
      drawYarn(g, s, spec);
      break;

    case 'circle':
      g.fillCircle(c, c, r);
      if (sw > 0) g.strokeCircle(c, c, r);
      break;

    case 'ring': {
      const hole = (spec.hole ?? 0.5) * r;
      const thickness = r - hole;
      g.lineStyle(thickness, spec.fill, 1);
      g.strokeCircle(c, c, hole + thickness / 2);
      if (sw > 0 && spec.stroke !== undefined) {
        g.lineStyle(sw, spec.stroke, 1);
        g.strokeCircle(c, c, r);
      }
      break;
    }

    case 'rect': {
      const p = sw / 2;
      g.fillRect(p, p, s - sw, s - sw);
      if (sw > 0) g.strokeRect(p, p, s - sw, s - sw);
      break;
    }

    case 'diamond': {
      const pts = [
        new Phaser.Geom.Point(c, sw / 2),
        new Phaser.Geom.Point(s - sw / 2, c),
        new Phaser.Geom.Point(c, s - sw / 2),
        new Phaser.Geom.Point(sw / 2, c),
      ];
      g.fillPoints(pts, true);
      if (sw > 0) g.strokePoints(pts, true, true);
      break;
    }

    case 'triangle': {
      const pts = [
        new Phaser.Geom.Point(c, sw / 2),
        new Phaser.Geom.Point(s - sw / 2, s - sw / 2),
        new Phaser.Geom.Point(sw / 2, s - sw / 2),
      ];
      g.fillPoints(pts, true);
      if (sw > 0) g.strokePoints(pts, true, true);
      break;
    }

    case 'star': {
      const pts: Phaser.Geom.Point[] = [];
      const spikes = 6;
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? r : r * 0.5;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        pts.push(new Phaser.Geom.Point(c + Math.cos(a) * rad, c + Math.sin(a) * rad));
      }
      g.fillPoints(pts, true);
      if (sw > 0) g.strokePoints(pts, true, true);
      break;
    }
  }
}

function makeTexture(scene: Phaser.Scene, key: string, spec: ShapeSpec, walk = 0) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const px = spec.size * SUPERSAMPLE;
  const g = scene.add.graphics();
  drawShape(g, spec, px, walk);
  g.generateTexture(key, px, px);
  g.destroy();
}

/**
 * BootScene 에서 로드한 PNG를 현재 테마 텍스처 키로 복제한다.
 * 원본 asset:* 키는 유지하므로 neon/forest를 거쳤다가 cats로 돌아와도 다시 쓸 수 있다.
 */
function copyAssetFrame(scene: Phaser.Scene, key: string, assetKey: string, frame: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const source = scene.textures.get(assetKey).get(frame);
  const canvas = scene.textures.createCanvas(key, source.width, source.height);
  if (!canvas) throw new Error(`Unable to create texture: ${key}`);
  canvas.drawFrame(assetKey, frame, 0, 0);
  canvas.refresh();
}

function makeGround(scene: Phaser.Scene, theme: Theme) {
  const key = TEX.ground;
  const tile = 64;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.add.graphics();
  g.fillStyle(theme.bg, 1);
  g.fillRect(0, 0, tile, tile);
  g.lineStyle(1, theme.gridLine, 1);
  g.strokeRect(0.5, 0.5, tile - 1, tile - 1);
  g.generateTexture(key, tile, tile);
  g.destroy();
}

/** 펄스의 실제 판정 반경을 아이콘과 분리해 보여준다. */
function makeAuraRange(scene: Phaser.Scene, theme: Theme) {
  const key = TEX.auraRange;
  const px = 256;
  const c = px / 2;
  const r = c - 6;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.add.graphics();
  g.fillStyle(theme.hudAccent, 0.08);
  g.fillCircle(c, c, r);
  g.lineStyle(5, theme.hudAccent, 0.8);
  g.strokeCircle(c, c, r);
  g.lineStyle(2, 0xffe2a8, 0.6);
  g.strokeCircle(c, c, r - 10);
  g.generateTexture(key, px, px);
  g.destroy();
}

function makeHeal(scene: Phaser.Scene) {
  const key = TEX.heal;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.add.graphics();
  g.fillStyle(0xff6688, 1);
  g.fillCircle(18, 15, 11).fillCircle(34, 15, 11);
  g.fillTriangle(7, 19, 45, 19, 26, 45);
  g.lineStyle(3, 0x7a3045, 1).strokeCircle(18, 15, 11).strokeCircle(34, 15, 11)
    .lineBetween(7, 19, 26, 45).lineBetween(26, 45, 45, 19);
  g.generateTexture(key, 52, 52);
  g.destroy();
}

function makePixel(scene: Phaser.Scene) {
  const key = TEX.pixel;
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 1, 1);
  g.generateTexture(key, 1, 1);
  g.destroy();
}

/**
 * 테마에 정의된 모든 도형을 런타임 텍스처로 굽는다.
 *
 * === 실제 아트로 교체하는 방법 ===
 * 1) PNG 를 public/assets/ 아래에 둔다.
 * 2) Theme.images 에 { 'tex:player': 'assets/player.png', ... } 형태로 매핑한다.
 * 3) BootScene 이 preload 단계에서 해당 키를 먼저 로드하고,
 *    여기서는 이미 존재하는 키를 건너뛴다.
 * 게임 로직은 TEX.* 키만 참조하므로 수정할 필요가 없다.
 */
export function buildTextures(scene: Phaser.Scene, theme: Theme) {
  const has = (k: string) => theme.images?.[k] !== undefined && scene.textures.exists(k);

  const playerSheet = selectedCharacter.sheet;
  const useBitmapSprites = theme.id === 'cats' && scene.textures.exists(playerSheet);
  if (useBitmapSprites) {
    copyAssetFrame(scene, TEX.player, playerSheet, 0);
    for (let frame = 0; frame < 4; frame++) copyAssetFrame(scene, TEX.playerWalk(frame), playerSheet, frame);
    for (const kind of Object.keys(theme.enemies)) {
      copyAssetFrame(scene, TEX.enemy(kind), 'asset:mouse:sheet', 0);
      for (let frame = 0; frame < 4; frame++) copyAssetFrame(scene, TEX.enemyWalk(kind, frame), 'asset:mouse:sheet', frame);
    }

    const skillFrames: Record<string, number> = {
      shard: 0, scatter: 1, orbit: 2, aura: 3,
      'skill:might': 4, 'skill:haste': 5, 'skill:boots': 6, 'skill:magnet': 7,
      'skill:armor': 8, 'skill:vitality': 9, 'skill:area': 10,
    };
    for (const [id, frame] of Object.entries(skillFrames)) copyAssetFrame(scene, TEX.proj(id), 'asset:skill:sheet', frame);
    for (const [id, frame] of Object.entries({ tempest: 0, tornado: 1, barrier: 2, shower: 3 })) {
      copyAssetFrame(scene, TEX.proj(id), 'asset:collab:sheet', frame);
    }
    for (const [key, frame] of Object.entries({ [TEX.gemSmall]: 0, [TEX.gemMedium]: 1, [TEX.gemLarge]: 2, [TEX.gemBoss]: 3 })) {
      copyAssetFrame(scene, key, 'asset:gem:sheet', frame);
    }
  }

  if (!useBitmapSprites && !has(TEX.player)) makeTexture(scene, TEX.player, theme.player);
  if (!useBitmapSprites) {
    for (let frame = 0; frame < 4; frame++) makeTexture(scene, TEX.playerWalk(frame), theme.player, frame);
  }

  for (const [kind, spec] of Object.entries(theme.enemies)) {
    const key = TEX.enemy(kind);
    if (!useBitmapSprites && !has(key)) makeTexture(scene, key, spec);
    if (!useBitmapSprites) {
      for (let frame = 0; frame < 4; frame++) makeTexture(scene, TEX.enemyWalk(kind, frame), spec, frame);
    }
  }

  for (const [id, spec] of Object.entries(theme.projectiles)) {
    const key = TEX.proj(id);
    if (!has(key) && !(useBitmapSprites && scene.textures.exists(TEX.proj(id)))) makeTexture(scene, key, spec);
  }

  if (!has(TEX.gem)) makeTexture(scene, TEX.gem, theme.gem);
  if (!has(TEX.gemBig)) makeTexture(scene, TEX.gemBig, theme.gemBig);
  if (!scene.textures.exists(TEX.gemSmall)) makeTexture(scene, TEX.gemSmall, theme.gem);
  if (!scene.textures.exists(TEX.gemMedium)) makeTexture(scene, TEX.gemMedium, theme.gemBig);
  if (!scene.textures.exists(TEX.gemLarge)) makeTexture(scene, TEX.gemLarge, theme.gemBig);
  if (!scene.textures.exists(TEX.gemBoss)) makeTexture(scene, TEX.gemBoss, theme.gemBig);
  makeHeal(scene);

  makeGround(scene, theme);
  makeAuraRange(scene, theme);
  makePixel(scene);
}
