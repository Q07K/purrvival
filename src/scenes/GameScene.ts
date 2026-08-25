import Phaser from 'phaser';
import {
  CELL_SIZE, DESPAWN_RADIUS, KNOCKBACK_DECAY, MAX_ENEMIES, MAX_GEMS,
  MAX_PROJECTILES, PLAYER, VIEW, GEM, difficultyScale, xpForLevel, OVERTIME_TIME,
} from '../config';
import { EV, bus } from '../bus';
import { BURROW_RAIDER, ELITE, ELITE_INTERVAL, ENEMY_KINDS, FINAL_BOSS } from '../data/enemies';
import type { EnemyKind } from '../data/enemies';
import { Pool } from '../systems/Pool';
import { Progression } from '../systems/Progression';
import { SpatialHash } from '../systems/SpatialHash';
import { sfx } from '../systems/Sfx';
import { meta } from '../systems/MetaProgression';
import { selectedCharacter } from '../data/characters';
import { TEX, buildTextures, cycleTheme, getTheme } from '../theme';
import type { Choice, Enemy, EnemyShot, Gem, HudStats, MutationChoice, PlayerState, Projectile, RareChoice, WeaponStats } from '../types';

const DEPTH = { ground: 0, gem: 5, aura: 8, enemy: 10, player: 20, proj: 30 };
const BACKGROUNDS = ['asset:bg:attic', 'asset:bg:cellar', 'asset:bg:garden', 'asset:bg:rooftop', 'asset:bg:toyroom'];

export class GameScene extends Phaser.Scene {
  private player!: PlayerState;
  private playerSprite!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.TileSprite;
  private backgroundKey = BACKGROUNDS[0];

  private enemies!: Pool<Enemy>;
  private projectiles!: Pool<Projectile>;
  private enemyShots!: Pool<EnemyShot>;
  private gems!: Pool<Gem>;

  /** 적 전용 브로드페이즈. 매 프레임 재구축된다. */
  private hash = new SpatialHash(CELL_SIZE);
  /** query 결과 재사용 버퍼 — 프레임당 수백 번 호출되므로 매번 할당하면 안 된다. */
  private qbuf: number[] = [];

  private prog = new Progression();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  /** 무기 슬롯별 시각 요소(궤도체, 장판) */
  private weaponVisuals = new Map<number, Phaser.GameObjects.Image[]>();
  private collabFx = new Map<number, Phaser.GameObjects.Graphics>();
  private projectileTrails?: Phaser.GameObjects.Graphics;
  private bossFx?: Phaser.GameObjects.Graphics;
  private eventSprite?: Phaser.GameObjects.Image;
  private eventFx?: Phaser.GameObjects.Graphics;
  private shrine?: { x: number; y: number; expires: number };
  private cartRemaining = 0;
  private burrowBudget = 0;

  private elapsed = 0;
  private rate = 1;
  private kills = 0;
  private uidSeq = 1;
  private spawnCredit = 0;
  private nextGemMergeAt = 0;
  private nextEliteAt = ELITE_INTERVAL;
  private nextMapEventAt = 5 * 60;
  private mapEventIndex = 0;
  private nextMutationAt = OVERTIME_TIME;
  private mutationCount = 0;
  private abyssNextLevel = 0;
  private abyssCharges = 0;
  private abyssContracts = 0;
  private lastAbyssAt = 0;
  private spawnMult = 1;
  private enemyHpMult = 1;
  private enemyDamageMult = 1;
  private chargerWeightMult = 1;
  private slingerWeightMult = 1;
  private goldMult = 1;
  private gemXpMult = 1;
  private rareDamageMult = 1;
  private rareHpMult = 1;
  private rareSpeedMult = 1;
  private rareMagnetMult = 1;
  private rareCooldownMult = 1;
  private cleared = false;
  private overtime = false;
  private earnedGold = 0;
  private pendingLevels = 0;
  private awaitingChoice = false;
  private dead = false;
  private sepPhase = 0;
  private aimX = 1;
  private aimY = 0;
  private playerMoving = false;
  private touchOrigin?: Phaser.Math.Vector2;
  private touchDirection = new Phaser.Math.Vector2();

  private hud: HudStats = {
    hp: 0, maxHp: 0, level: 1, xp: 0, xpNext: 0, time: 0, kills: 0, enemies: 0,
  };

  constructor() {
    super('Game');
  }

  /* ================================================================ */
  /* 초기화                                                            */
  /* ================================================================ */

  create() {
    this.elapsed = 0;
    this.rate = 1;
    this.kills = 0;
    this.uidSeq = 1;
    this.spawnCredit = 0;
    this.nextGemMergeAt = 0;
    this.nextEliteAt = ELITE_INTERVAL;
    this.nextMapEventAt = 5 * 60;
    this.mapEventIndex = 0;
    this.nextMutationAt = OVERTIME_TIME;
    this.mutationCount = 0;
    this.abyssNextLevel = 0;
    this.abyssCharges = 0;
    this.abyssContracts = 0;
    this.lastAbyssAt = 0;
    this.spawnMult = 1;
    this.enemyHpMult = 1;
    this.enemyDamageMult = 1;
    this.chargerWeightMult = 1;
    this.slingerWeightMult = 1;
    this.goldMult = 1;
    this.gemXpMult = 1;
    this.rareDamageMult = 1;
    this.rareHpMult = 1;
    this.rareSpeedMult = 1;
    this.rareMagnetMult = 1;
    this.rareCooldownMult = 1;
    this.shrine = undefined;
    this.cartRemaining = 0;
    this.burrowBudget = 0;
    this.cleared = false;
    this.overtime = false;
    this.earnedGold = 0;
    this.pendingLevels = 0;
    this.awaitingChoice = false;
    this.dead = false;

    const theme = getTheme();
    buildTextures(this, theme);
    this.cameras.main.setBackgroundColor(theme.bg);
    this.backgroundKey = Phaser.Utils.Array.GetRandom(BACKGROUNDS);

    this.ground = this.add
      .tileSprite(0, 0, VIEW.width, VIEW.height, this.backgroundKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.ground);

    this.player = {
      x: 0, y: 0,
      hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
      level: 1, xp: 0, xpNext: xpForLevel(1),
      invuln: 0,
      speed: PLAYER.baseSpeed,
      damageMult: 1, cooldownMult: 1, areaMult: 1, xpMult: 1, projectileSpeedMult: 1, projectileLifeMult: 1, auraCooldownMult: 1, orbitSpeedMult: 1,
      magnet: PLAYER.magnet, armor: 0,
    };

    this.playerSprite = this.add.image(0, 0, TEX.player).setDepth(DEPTH.player);
    this.applyPlayerScale();

    this.enemies = new Pool<Enemy>(
      MAX_ENEMIES,
      (index) => this.makeEnemy(index),
      (e) => e.sprite.setVisible(false),
    );
    this.projectiles = new Pool<Projectile>(
      MAX_PROJECTILES,
      (index) => this.makeProjectile(index),
      (p) => p.sprite.setVisible(false),
    );
    this.enemyShots = new Pool<EnemyShot>(
      160,
      (index) => this.makeEnemyShot(index),
      (shot) => shot.sprite.setVisible(false),
    );
    this.gems = new Pool<Gem>(
      MAX_GEMS,
      (index) => this.makeGem(index),
      (g) => g.sprite.setVisible(false),
    );

    this.weaponVisuals.clear();
    this.prog.reset();
    this.prog.applyPassives(this.player);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    // 이동은 매 프레임 isDown 을 읽으면 되지만, 단발 입력은 이벤트로 받는다.
    // update() 안에서 JustDown 을 폴링하면 키가 큐에 들어온 프레임에 update 가
    // 돌지 않을 때(탭 비활성/프레임 드랍) 입력이 통째로 씹힌다.
    kb.on('keydown-T', this.onCycleTheme, this);
    kb.on('keydown-ESC', this.onPause, this);
    kb.on('keydown-F', this.onCycleRate, this);
    kb.on('keydown', sfx.unlock, sfx);
    this.input.on('pointerdown', this.onTouchStart, this);
    this.input.on('pointermove', this.onTouchMove, this);
    this.input.on('pointerup', this.onTouchEnd, this);

    this.cameras.main.startFollow(this.playerSprite, true, 0.18, 0.18);
    this.cameras.main.setRoundPixels(true);

    if (!this.scene.isActive('UI')) this.scene.launch('UI');

    bus.on(EV.picked, this.onPicked, this);
    bus.on(EV.rarePicked, this.onRarePicked, this);
    bus.on(EV.mutationPicked, this.onMutationPicked, this);
    bus.on(EV.restart, this.onRestart, this);
    bus.on(EV.resume, this.onResume, this);
    bus.on(EV.speed, this.onRate, this);
    bus.on(EV.pauseRequest, this.onPause, this);
    bus.on(EV.overtime, this.onOvertime, this);
    bus.on(EV.menu, this.onMenu, this);
    bus.on(EV.quit, this.onQuit, this);
    bus.on(EV.resize, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EV.picked, this.onPicked, this);
      bus.off(EV.rarePicked, this.onRarePicked, this);
      bus.off(EV.mutationPicked, this.onMutationPicked, this);
      bus.off(EV.restart, this.onRestart, this);
      bus.off(EV.resume, this.onResume, this);
      bus.off(EV.speed, this.onRate, this);
      bus.off(EV.pauseRequest, this.onPause, this);
      bus.off(EV.overtime, this.onOvertime, this);
      bus.off(EV.menu, this.onMenu, this);
      bus.off(EV.quit, this.onQuit, this);
      kb.off('keydown-F', this.onCycleRate, this);
      bus.off(EV.resize, this.onResize, this);
      this.input.off('pointerdown', this.onTouchStart, this);
      this.input.off('pointermove', this.onTouchMove, this);
      this.input.off('pointerup', this.onTouchEnd, this);
      kb.off('keydown', sfx.unlock, sfx);
    });
  }

  private onTouchStart(pointer: Phaser.Input.Pointer) {
    sfx.unlock();
    this.touchOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.touchDirection.set(0, 0);
  }

  private onTouchMove(pointer: Phaser.Input.Pointer) {
    if (!this.touchOrigin || !pointer.isDown) return;
    this.touchDirection.set(pointer.x - this.touchOrigin.x, pointer.y - this.touchOrigin.y);
    if (this.touchDirection.lengthSq() > 20 * 20) this.touchDirection.normalize();
    else this.touchDirection.set(0, 0);
  }

  private onTouchEnd() {
    this.touchOrigin = undefined;
    this.touchDirection.set(0, 0);
  }

  private makeEnemy(index: number): Enemy {
    return {
      index, active: false, uid: 0, kind: 'grunt',
      x: 0, y: 0, hp: 1, maxHp: 1, speed: 0, damage: 0, radius: 10, xp: 1,
      hitAt: new Float64Array(8),
      knockX: 0, knockY: 0, specialAt: 0, specialUntil: 0, flash: 0, elite: false, boss: false, gemTier: 0,
      sprite: this.add.image(0, 0, TEX.enemy('grunt')).setDepth(DEPTH.enemy).setVisible(false),
    };
  }

  private makeProjectile(index: number): Projectile {
    return {
      index, active: false,
      x: 0, y: 0, vx: 0, vy: 0, damage: 0, radius: 6,
      pierce: 1, life: 0, slot: 0, knockback: 0, hitUids: [], tex: 'shard',
      sprite: this.add.image(0, 0, TEX.proj('shard')).setDepth(DEPTH.proj).setVisible(false),
    };
  }

  private makeEnemyShot(index: number): EnemyShot {
    return {
      index, active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 0, life: 0,
      sprite: this.add.image(0, 0, 'asset:gem:sheet', 0).setDepth(DEPTH.proj).setVisible(false),
    };
  }

  private makeGem(index: number): Gem {
    return {
      index, active: false,
      x: 0, y: 0, vx: 0, vy: 0, xp: 1, attracted: false, big: false, heal: false,
      sprite: this.add.image(0, 0, TEX.gemSmall).setDepth(DEPTH.gem).setVisible(false),
    };
  }

  /**
   * 텍스처는 선명하게 하려고 실제 표시 크기보다 크게 굽는다(SUPERSAMPLE).
   * 게다가 테마마다 텍스처 크기가 다르므로, 표시 크기는 항상
   * "현재 텍스처의 실제 폭" 을 보고 맞춰야 한다.
   */
  private scaleTo(img: Phaser.GameObjects.Image, targetPx: number) {
    const src = img.texture.getSourceImage();
    if (src.width > 0) img.setScale(targetPx / src.width);
  }

  /**
   * 적 스프라이트의 표시 크기.
   *
   * 꼬리와 귀는 몸통 밖으로 뻗으므로, 텍스처 박스를 히트박스 지름에 그대로
   * 맞추면 정작 몸이 히트박스보다 작아 보인다. bodyRatio 로 보정해서
   * "몸통 폭 = 히트박스 지름" 이 되게 한다.
   */
  private enemyDisplaySize(kind: string, radius: number): number {
    const ratio = getTheme().enemies[kind]?.bodyRatio ?? 1;
    return (radius * 2) / ratio;
  }

  /**
   * 플레이어도 같은 규칙. bodyRatio 가 있으면 히트박스에서 역산하고,
   * 없으면(도형 테마) 테마가 지정한 size 를 그대로 쓴다.
   */
  private playerDisplaySize(): number {
    const spec = getTheme().player;
    return spec.bodyRatio ? (PLAYER.radius * 2) / spec.bodyRatio : spec.size;
  }

  /** 플레이어 본체 크기를 맞춘다 (테마 교체 시에도 호출) */
  private applyPlayerScale() {
    const size = this.playerDisplaySize();
    this.scaleTo(this.playerSprite, size);
  }

  /* ================================================================ */
  /* 메인 루프                                                         */
  /* ================================================================ */

  update(_time: number, delta: number) {
    if (this.dead || this.awaitingChoice) return;

    // 탭 전환 등으로 delta 가 튀면 한 프레임에 적이 순간이동한다. 반드시 클램프.
    const dt = Math.min(delta, 50) / 1000 * this.rate;
    this.elapsed += dt;

    this.stepPlayer(dt);
    this.stepSpawning(dt);
    this.stepMapEvents();
    this.stepShrine();
    this.stepEnemies(dt);

    // 적이 움직인 뒤에 해시를 다시 세워야 충돌 판정이 정확하다.
    this.rebuildHash();
    this.stepSeparation();

    this.stepWeapons(this.elapsed * 1000, dt);
    this.stepProjectiles(dt);
    this.stepEnemyShots(dt);
    this.stepGems(dt);
    if (this.elapsed >= this.nextGemMergeAt) {
      this.nextGemMergeAt = this.elapsed + 0.8;
      this.mergeLooseGems();
    }
    this.stepPlayerDamage();

    this.render();
    this.emitHud();

    if (this.player.hp <= 0) this.onDeath();
    else if (this.pendingLevels > 0) this.openLevelUp();
  }

  /* ---------------------------------------------------------------- */

  private stepPlayer(dt: number) {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.A.isDown || k.LEFT.isDown) dx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) dx += 1;
    if (k.W.isDown || k.UP.isDown) dy -= 1;
    if (k.S.isDown || k.DOWN.isDown) dy += 1;
    if (dx === 0 && dy === 0 && this.touchDirection.lengthSq() > 0) {
      dx = this.touchDirection.x;
      dy = this.touchDirection.y;
    }

    this.playerMoving = dx !== 0 || dy !== 0;
    if (this.playerMoving) {
      const inv = 1 / Math.hypot(dx, dy);
      dx *= inv;
      dy *= inv;
      this.aimX = dx;
      this.aimY = dy;
      this.player.x += dx * this.player.speed * dt;
      this.player.y += dy * this.player.speed * dt;
    }

    if (this.player.invuln > 0) this.player.invuln -= dt;
  }

  private stepSpawning(dt: number) {
    const d = difficultyScale(this.elapsed);
    this.spawnCredit += d.rate * this.spawnMult * dt;

    while (this.spawnCredit >= 1) {
      if (this.enemies.live >= MAX_ENEMIES) {
        this.spawnCredit = 0;
        break;
      }
      const kind = this.pickKind();
      // 예산은 "이벤트" 가 아니라 "마릿수" 단위다.
      // 무리로 나오는 swarm 을 1로 치면 실제 스폰량이 배로 튄다.
      this.spawnCredit -= kind.cluster;
      for (let i = 0; i < kind.cluster; i++) {
        const point = this.spawnPoint();
        this.spawnEnemy(
          kind,
          point.x + (Math.random() - 0.5) * 60,
          point.y + (Math.random() - 0.5) * 60,
          d.hp,
          d.speed,
        );
      }
    }

    if (this.elapsed >= this.nextEliteAt) {
      this.nextEliteAt += this.overtime && this.elapsed >= OVERTIME_TIME ? 30 : ELITE_INTERVAL;
      const point = this.spawnPoint(120);
      this.spawnEnemy(
        ELITE,
        point.x,
        point.y,
        d.hp,
        d.speed,
      );
    }
  }

  /** 5분마다 전투 리듬을 바꾸는 맵 이벤트. 4번째는 최종 보스와 함께 연출만 추가한다. */
  private stepMapEvents() {
    if (this.overtime) {
      if (this.elapsed < this.nextMutationAt) return;
      this.nextMutationAt += 5 * 60;
      this.awaitingChoice = true;
      bus.emit(EV.mutationChoice, { choices: this.mutationChoices(), stage: this.mutationCount + 1 });
      this.scene.pause();
      return;
    }
    if (this.elapsed < this.nextMapEventAt) return;
    this.nextMapEventAt += 5 * 60;
    const kind = this.mapEventIndex++ % 4;
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * 190;
    const y = this.player.y + Math.sin(angle) * 130;
    this.showMapEvent(kind, x, y);
    bus.emit(EV.mapEvent, ['치즈 수레 습격', '굴 붕괴', '털실 제단', '달빛 사냥'][kind]);
    const d = difficultyScale(this.elapsed);

    if (kind === 0) this.startCheeseCart(x, y, d);
    else if (kind === 1) this.startBurrow(x, y);
    else if (kind === 2) this.shrine = { x, y, expires: this.elapsed + 15 };
    else this.startMoonHunt(x, y);
  }

  private showMapEvent(frame: number, x: number, y: number) {
    this.eventSprite?.destroy();
    this.eventFx?.destroy();
    const sprite = this.eventSprite = this.add.image(x, y, 'asset:event:sheet', frame).setDepth(DEPTH.aura).setScale(0.22);
    const fx = this.eventFx = this.add.graphics().setDepth(DEPTH.aura - 1);
    const color = [0xffd36b, 0xff5b5b, 0xff9eb4, 0x78b8ff][frame];
    fx.lineStyle(3, color, 0.7).strokeCircle(x, y, frame === 1 ? 150 : frame === 3 ? 260 : 110);
    this.tweens.add({ targets: sprite, scale: 0.25, duration: 550, yoyo: true, repeat: 3 });
    this.time.delayedCall(15000, () => {
      if (this.eventSprite === sprite) { sprite.destroy(); this.eventSprite = undefined; }
      if (this.eventFx === fx) { fx.destroy(); this.eventFx = undefined; }
    });
  }

  private startCheeseCart(x: number, y: number, d: ReturnType<typeof difficultyScale>) {
    this.cartRemaining = Math.min(5, MAX_ENEMIES - this.enemies.live);
    if (!this.cartRemaining) return;
    this.spawnEnemy(ELITE, x, y, d.hp * 1.8, d.speed, false, 0, 'cart');
    for (let i = 1; i < this.cartRemaining; i++) {
      const a = i * Math.PI * 2 / (this.cartRemaining - 1);
      this.spawnEnemy(ENEMY_KINDS[2], x + Math.cos(a) * 70, y + Math.sin(a) * 70, d.hp, d.speed, false, 0, 'cart');
    }
  }

  private startBurrow(x: number, y: number) {
    const cap = this.enemies.live >= 700 ? 80 : 100;
    this.burrowBudget = Math.max(0, Math.min(cap, MAX_ENEMIES - this.enemies.live - 1));
    this.eventFx?.clear().lineStyle(4, 0xff5a5a, 0.9).strokeCircle(x, y, 150);
    this.tweens.add({ targets: this.eventSprite, angle: { from: -3, to: 3 }, duration: 140, yoyo: true, repeat: 18 });
    this.time.delayedCall(3000, () => this.spawnBurrowWave(x, y, Math.ceil(this.burrowBudget / 2), false));
    this.time.delayedCall(8000, () => this.spawnBurrowWave(x, y, Math.floor(this.burrowBudget / 2), true));
    this.time.delayedCall(13000, () => {
      const d = difficultyScale(this.elapsed);
      this.spawnEnemy(ELITE, x, y, d.hp, d.speed, false, 1, 'burrow');
    });
  }

  private spawnBurrowWave(x: number, y: number, count: number, fan: boolean) {
    const d = difficultyScale(this.elapsed);
    const aim = Math.atan2(this.player.y - y, this.player.x - x);
    for (let i = 0; i < count && this.enemies.live < MAX_ENEMIES; i++) {
      const a = fan ? aim + (i / Math.max(1, count - 1) - 0.5) * Math.PI * 0.85 : i * Math.PI * 2 / count;
      this.spawnEnemy(BURROW_RAIDER, x + Math.cos(a) * 32, y + Math.sin(a) * 32, d.hp, d.speed, false, 1);
    }
  }

  private startMoonHunt(x: number, y: number) {
    this.time.delayedCall(3000, () => {
      const d = difficultyScale(this.elapsed);
      this.spawnEnemy(FINAL_BOSS, x, y, d.hp, d.speed, true);
    });
  }

  private stepShrine() {
    if (!this.shrine) return;
    const shrine = this.shrine;
    if (this.elapsed >= shrine.expires) { this.shrine = undefined; return; }
    const dx = shrine.x - this.player.x;
    const dy = shrine.y - this.player.y;
    if (dx * dx + dy * dy > 90 * 90) return;
    this.shrine = undefined;
    this.eventSprite?.destroy(); this.eventSprite = undefined;
    this.eventFx?.destroy(); this.eventFx = undefined;
    this.awaitingChoice = true;
    bus.emit(EV.rareChoice, { choices: this.rareChoices() });
    this.scene.pause();
  }

  private rareChoices(): RareChoice[] {
    const power = meta.rarePower();
    const choices: RareChoice[] = [
      { id: 'crown', name: '치즈 왕관', detail: `이번 런 모든 피해 +${Math.round(35 * power)}%`, frame: 0 },
      { id: 'heart', name: '성스러운 털실', detail: `HP 전부 회복 · 최대 HP +${Math.round(25 * power)}%`, frame: 1 },
      { id: 'moon', name: '달빛 발자국', detail: `이동 속도 +${Math.round(20 * power)}% · 획득 범위 +${Math.round(35 * power)}%`, frame: 2 },
      { id: 'comet', name: '무지개 실타래', detail: `모든 무기 공격 간격 -${Math.round(25 * power)}%`, frame: 3 },
    ];
    return choices.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  /** 현재 카메라 사각형의 네 변 바로 밖에서 적을 생성한다. */
  private spawnPoint(padding = 70) {
    const halfW = VIEW.width / 2 + padding;
    const halfH = VIEW.height / 2 + padding;
    const alongW = (Math.random() * 2 - 1) * halfW;
    const alongH = (Math.random() * 2 - 1) * halfH;

    switch (Phaser.Math.Between(0, 3)) {
      case 0: return { x: this.player.x - halfW, y: this.player.y + alongH };
      case 1: return { x: this.player.x + halfW, y: this.player.y + alongH };
      case 2: return { x: this.player.x + alongW, y: this.player.y - halfH };
      default: return { x: this.player.x + alongW, y: this.player.y + halfH };
    }
  }

  private pickKind(): EnemyKind {
    const avail = ENEMY_KINDS.filter((k) => this.elapsed >= k.from);
    let total = 0;
    for (const k of avail) total += this.enemyWeight(k);
    let r = Math.random() * total;
    for (const k of avail) {
      r -= this.enemyWeight(k);
      if (r <= 0) return k;
    }
    return avail[0];
  }

  private enemyWeight(kind: EnemyKind) {
    return kind.weight * (kind.id === 'charger' ? this.chargerWeightMult : kind.id === 'slinger' ? this.slingerWeightMult : 1);
  }

  private spawnEnemy(
    kind: EnemyKind, x: number, y: number, hpScale: number, spScale: number,
    boss = false, gemTier = 0, eventTag?: 'cart' | 'burrow',
  ) {
    const e = this.enemies.spawn();
    if (!e) return;

    e.uid = this.uidSeq++;
    e.kind = kind.id;
    e.x = x;
    e.y = y;
    e.maxHp = kind.hp * hpScale * this.enemyHpMult;
    e.hp = e.maxHp;
    e.speed = kind.speed * spScale;
    e.damage = kind.damage * difficultyScale(this.elapsed).damage * this.enemyDamageMult;
    e.radius = kind.radius;
    e.xp = kind.xp;
    e.elite = kind.elite;
    e.boss = boss;
    e.gemTier = gemTier;
    e.eventTag = eventTag;
    e.knockX = 0;
    e.knockY = 0;
    e.specialAt = this.elapsed * 1000 + 650 + Math.random() * 900;
    e.specialUntil = 0;
    e.flash = 0;
    e.hitAt.fill(0);

    e.sprite.setTexture(boss ? 'asset:boss:sheet' : kind.id === 'burrow' || kind.id === 'charger' ? 'asset:burrow:sheet' : kind.id === 'slinger' ? 'asset:slinger:sheet' : TEX.enemy(kind.id));
    if (boss) e.sprite.setScale(150 / 627);
    else if (kind.id === 'burrow' || kind.id === 'charger') e.sprite.setScale(80 / 768);
    else if (kind.id === 'slinger') e.sprite.setScale(52 / 543);
    else this.scaleTo(e.sprite, this.enemyDisplaySize(kind.id, e.radius));
    e.sprite.clearTint();
    e.sprite.setVisible(true);
  }

  private mutationChoices(): MutationChoice[] {
    return [
      { id: 'march', name: '쥐 대행진', detail: '적 생성 +35% · 골드/점수 보정 +25%' },
      { id: 'redMoon', name: '붉은 달', detail: '적 피해 +25% · 엘리트가 빠르게 등장 · 보정 +30%' },
      { id: 'harvest', name: '풍요의 달', detail: '적 HP +25% · 젬 경험치 +50% · 보정 +20%' },
    ];
  }

  private abyssChoices(): MutationChoice[] {
    return [
      { id: 'abyssRush', name: '돌격 계약', detail: '돌진 쥐 출현 +75% · 적 피해 +12% · 골드/점수 +35%' },
      { id: 'abyssVolley', name: '투석 계약', detail: '투석 쥐 출현 +80% · 적 피해 +12% · 젬 경험치 +25%' },
      { id: 'abyssHunt', name: '사냥 계약', detail: '적 HP +25% · 적 피해 +12% · 엘리트가 빠르게 등장 · 보정 +45%' },
    ];
  }

  private stepEnemies(dt: number) {
    const p = this.player;
    const items = this.enemies.items;
    const decay = Math.exp(-KNOCKBACK_DECAY * dt);

    for (let i = 0; i < items.length; i++) {
      const e = items[i];
      if (!e.active) continue;

      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);

      // 너무 멀어진 적은 회수한다. 안 그러면 풀이 유령으로 가득 차서 스폰이 멈춘다.
      if (dist > DESPAWN_RADIUS) {
        this.enemies.release(e);
        continue;
      }

      const inv = dist > 0.0001 ? 1 / dist : 0;
      const now = this.elapsed * 1000;
      let move = 1;
      let speed = e.speed;

      if (e.kind === 'charger') {
        if (now >= e.specialAt) {
          e.specialAt = now + 2800;
          e.specialUntil = now + 420;
        }
        if (now < e.specialUntil) speed *= 3.2;
      } else if (e.kind === 'slinger') {
        if (dist < 300) move = -1;
        else if (dist < 390) move = 0;
        if (dist <= 460 && now >= e.specialAt) {
          e.specialAt = now + 2150;
          e.specialUntil = now + 350;
          e.sprite.setTint(0xffd36b);
        }
        if (e.specialUntil > 0 && now >= e.specialUntil) {
          e.specialUntil = 0;
          e.sprite.clearTint();
          this.spawnEnemyShot(e, dx * inv, dy * inv);
        }
      }

      e.x += (dx * inv * speed * move + e.knockX) * dt;
      e.y += (dy * inv * speed * move + e.knockY) * dt;
      e.knockX *= decay;
      e.knockY *= decay;

      if (e.boss && dist <= 260 && this.elapsed * 1000 >= e.hitAt[7]) {
        e.hitAt[7] = this.elapsed * 1000 + 1600;
        p.hp -= Math.max(1, e.damage * 0.6 - p.armor);
        this.cameras.main.shake(150, 0.008);
        sfx.play('hurt');
      }

      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) e.sprite.clearTint();
      }
    }
  }

  private spawnEnemyShot(e: Enemy, dx: number, dy: number) {
    const shot = this.enemyShots.spawn();
    if (!shot) return;
    const speed = 340;
    shot.x = e.x + dx * (e.radius + 10);
    shot.y = e.y + dy * (e.radius + 10);
    shot.vx = dx * speed;
    shot.vy = dy * speed;
    shot.damage = e.damage * 0.75;
    shot.life = 2;
    shot.sprite.setPosition(shot.x, shot.y).setScale(22 / 627).setVisible(true);
  }

  private stepEnemyShots(dt: number) {
    const p = this.player;
    for (const shot of this.enemyShots.items) {
      if (!shot.active) continue;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      shot.sprite.setPosition(shot.x, shot.y).setRotation(Math.atan2(shot.vy, shot.vx));
      if (shot.life <= 0) { this.enemyShots.release(shot); continue; }
      const dx = p.x - shot.x;
      const dy = p.y - shot.y;
      if (dx * dx + dy * dy > 22 * 22) continue;
      if (p.invuln <= 0) {
        p.hp -= Math.max(1, shot.damage - p.armor);
        p.invuln = 0.25;
        this.cameras.main.shake(90, 0.004);
        sfx.play('hurt');
      }
      this.enemyShots.release(shot);
    }
  }

  private rebuildHash() {
    this.hash.clear();
    const items = this.enemies.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].active) this.hash.insert(items[i].x, items[i].y, i);
    }
  }

  /**
   * 적끼리 겹치지 않도록 밀어낸다. 이게 없으면 전부 한 점에 포개져서
   * 화면상 적이 열 마리처럼 보인다.
   * 비용이 커서 프레임마다 절반씩만 처리한다 — 눈으로는 차이가 없다.
   */
  private stepSeparation() {
    const items = this.enemies.items;
    const buf = this.qbuf;
    this.sepPhase ^= 1;

    for (let i = this.sepPhase; i < items.length; i += 2) {
      const e = items[i];
      if (!e.active) continue;

      this.hash.query(e.x, e.y, e.radius * 2, buf);
      for (let n = 0; n < buf.length; n++) {
        const j = buf[n];
        if (j === i) continue;
        const o = items[j];
        if (!o.active) continue;

        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const d2 = dx * dx + dy * dy;
        const min = e.radius + o.radius;
        if (d2 >= min * min) continue;

        if (d2 < 0.0001) {
          e.x += (Math.random() - 0.5) * 2;
          e.y += (Math.random() - 0.5) * 2;
          continue;
        }
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5;
        e.x += dx * push;
        e.y += dy * push;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 무기                                                              */
  /* ---------------------------------------------------------------- */

  private stepWeapons(time: number, dt: number) {
    for (const w of this.prog.weapons) {
      const s = this.prog.statsFor(w, this.player);

      switch (w.def.behavior) {
        case 'projectile':
        case 'spread':
          if (time >= w.nextAt) {
            w.nextAt = time + s.cooldown;
            if (w.def.behavior === 'projectile') this.fireHoming(w.slot, s, w.def.tex);
            else this.fireSpread(w.slot, s, w.def.tex);
          }
          break;

        case 'orbit':
          w.phase += s.speed * dt;
          this.updateOrbit(w.slot, s, time, w.phase, w.def.tex);
          break;

        case 'aura':
          this.updateAura(w.slot, s, time, w.def.tex);
          break;

        case 'rain':
          if (time >= w.nextAt) {
            w.nextAt = time + s.cooldown;
            this.fireRain(w.slot, s, w.def.tex);
          }
          break;
      }
    }
  }

  private fireHoming(slot: number, s: WeaponStats, tex: string) {
    const p = this.player;
    sfx.play('fire');
    for (let i = 0; i < s.count; i++) {
      const target = this.nearestEnemy(p.x, p.y, 460, i);
      let dx = this.aimX;
      let dy = this.aimY;
      if (target) {
        dx = target.x - p.x;
        dy = target.y - p.y;
        const inv = 1 / (Math.hypot(dx, dy) || 1);
        dx *= inv;
        dy *= inv;
      }
      this.spawnProjectile(p.x, p.y, dx * s.speed, dy * s.speed, s, slot, tex);
    }
  }

  private fireSpread(slot: number, s: WeaponStats, tex: string) {
    const p = this.player;
    sfx.play('fire');
    const base = Math.atan2(this.aimY, this.aimX);
    const spread = Phaser.Math.DegToRad(tex === 'tempest' ? 110 : 55);
    const n = Math.max(1, Math.round(s.count));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      const a = base + t * spread;
      this.spawnProjectile(p.x, p.y, Math.cos(a) * s.speed, Math.sin(a) * s.speed, s, slot, tex);
    }
  }

  private fireRain(slot: number, s: WeaponStats, tex: string) {
    const p = this.player;
    sfx.play('fire');
    const range = tex === 'shower' ? 260 : s.area * 1.2;
    for (let i = 0; i < s.count; i++) {
      const lane = s.count === 1 ? 0 : i / (s.count - 1) - 0.5;
      const x = p.x + lane * range * 2 + (Math.random() - 0.5) * 24;
      const y = p.y - range + (i % 2) * 95;
      this.spawnProjectile(x, y, 0, s.speed, s, slot, tex);
    }
  }

  private spawnProjectile(
    x: number, y: number, vx: number, vy: number,
    s: WeaponStats, slot: number, tex: string,
  ) {
    const pr = this.projectiles.spawn();
    if (!pr) return;
    pr.x = x;
    pr.y = y;
    pr.vx = vx;
    pr.vy = vy;
    pr.damage = s.damage;
    pr.radius = s.area;
    pr.pierce = s.pierce;
    pr.life = s.life;
    pr.slot = slot;
    pr.knockback = s.knockback;
    pr.hitUids.length = 0;
    pr.tex = tex;
    pr.sprite.setTexture(TEX.proj(tex));
    this.scaleTo(pr.sprite, getTheme().projectiles[tex].size);
    pr.sprite.setRotation(0);
    pr.sprite.setVisible(true);
  }

  /**
   * 반경 안에서 가장 가까운 적. skip 을 주면 그다음으로 가까운 적을 고른다
   * (탄 여러 발이 한 놈에게만 몰리지 않도록).
   */
  private nearestEnemy(x: number, y: number, range: number, skip = 0): Enemy | null {
    const items = this.enemies.items;
    const buf = this.hash.query(x, y, range, this.qbuf);

    let best: Enemy | null = null;
    const seen: number[] = [];

    for (let pass = 0; pass <= skip; pass++) {
      best = null;
      let bestD = range * range;
      for (let n = 0; n < buf.length; n++) {
        const e = items[buf[n]];
        if (!e.active || seen.indexOf(e.uid) !== -1) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) {
          bestD = d2;
          best = e;
        }
      }
      if (!best) break;
      seen.push(best.uid);
    }
    return best;
  }

  private stepProjectiles(dt: number) {
    const items = this.projectiles.items;
    const enemies = this.enemies.items;
    const buf = this.qbuf;

    for (let i = 0; i < items.length; i++) {
      const pr = items[i];
      if (!pr.active) continue;

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0) {
        this.projectiles.release(pr);
        continue;
      }

      this.hash.query(pr.x, pr.y, pr.radius + 24, buf);
      for (let n = 0; n < buf.length; n++) {
        const e = enemies[buf[n]];
        if (!e.active || pr.hitUids.indexOf(e.uid) !== -1) continue;

        const rr = pr.radius + e.radius;
        const dx = e.x - pr.x;
        const dy = e.y - pr.y;
        if (dx * dx + dy * dy > rr * rr) continue;

        pr.hitUids.push(e.uid);
        const inv = 1 / (Math.hypot(pr.vx, pr.vy) || 1);
        this.damageEnemy(e, pr.damage, pr.vx * inv, pr.vy * inv, pr.knockback);

        if (--pr.pierce <= 0) {
          this.projectiles.release(pr);
          break;
        }
      }
    }
    this.drawProjectileTrails();
  }

  private updateOrbit(slot: number, s: WeaponStats, time: number, phase: number, tex: string) {
    const p = this.player;
    const n = Math.max(1, Math.round(s.count));
    const orbs = this.ensureVisuals(slot, n, TEX.proj(tex), DEPTH.proj);
    const enemies = this.enemies.items;
    const buf = this.qbuf;
    const rad = Phaser.Math.DegToRad(phase);
    const hitR = 14;
    const orbSize = getTheme().projectiles[tex].size;

    for (let i = 0; i < n; i++) {
      const a = rad + (Math.PI * 2 * i) / n;
      const ox = p.x + Math.cos(a) * s.area;
      const oy = p.y + Math.sin(a) * s.area;
      if (tex === 'tornado') orbs[i].setVisible(false);
      else {
        const pulse = tex === 'orbit' ? 1 + Math.sin(time * 0.012 + i) * 0.1 : 1;
        orbs[i].setPosition(ox, oy).setVisible(true).setAlpha(tex === 'orbit' ? 0.82 + pulse * 0.16 : 1);
        this.scaleTo(orbs[i], orbSize * pulse);
      }

      this.hash.query(ox, oy, hitR + 24, buf);
      for (let k = 0; k < buf.length; k++) {
        const e = enemies[buf[k]];
        if (!e.active || time < e.hitAt[slot]) continue;
        const rr = hitR + e.radius;
        const dx = e.x - ox;
        const dy = e.y - oy;
        if (dx * dx + dy * dy > rr * rr) continue;

        e.hitAt[slot] = time + s.cooldown;
        const kx = e.x - p.x;
        const ky = e.y - p.y;
        const inv = 1 / (Math.hypot(kx, ky) || 1);
        this.damageEnemy(e, s.damage, kx * inv, ky * inv, s.knockback);
      }
    }
    if (tex === 'tornado') this.drawTornado(slot, s, time);
  }

  private updateAura(slot: number, s: WeaponStats, time: number, tex: string) {
    const p = this.player;
    const visuals = this.ensureVisuals(slot, 1, TEX.auraRange, DEPTH.aura);
    const ring = visuals[0];
    ring.setPosition(p.x, p.y).setVisible(tex !== 'barrier').setAlpha(1).setRotation(0);
    this.scaleTo(ring, s.area * 2);
    if (tex === 'barrier') {
      this.drawBarrier(slot, s, time);
    }
    if (tex === 'aura') this.drawPulse(slot, s, time);

    const enemies = this.enemies.items;
    const buf = this.hash.query(p.x, p.y, s.area + 24, this.qbuf);

    for (let k = 0; k < buf.length; k++) {
      const e = enemies[buf[k]];
      if (!e.active || time < e.hitAt[slot]) continue;
      const rr = s.area + e.radius;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > rr * rr) continue;

      e.hitAt[slot] = time + s.cooldown;
      const inv = 1 / (Math.hypot(dx, dy) || 1);
      this.damageEnemy(e, s.damage, dx * inv, dy * inv, s.knockback);
    }
  }

  /** 슬롯별 시각 요소 개수를 맞춰준다(레벨업으로 궤도체가 늘어날 때) */
  private ensureVisuals(slot: number, count: number, tex: string, depth: number) {
    let arr = this.weaponVisuals.get(slot);
    if (!arr) {
      arr = [];
      this.weaponVisuals.set(slot, arr);
    }
    while (arr.length < count) {
      arr.push(this.add.image(0, 0, tex).setDepth(depth));
    }
    for (let i = count; i < arr.length; i++) arr[i].setVisible(false);
    return arr;
  }

  private clearWeaponVisuals() {
    for (const arr of this.weaponVisuals.values()) for (const visual of arr) visual.destroy();
    this.weaponVisuals.clear();
    for (const fx of this.collabFx.values()) fx.destroy();
    this.collabFx.clear();
    this.projectileTrails?.destroy();
    this.projectileTrails = undefined;
  }

  private collabGraphic(slot: number) {
    let fx = this.collabFx.get(slot);
    if (!fx) {
      fx = this.add.graphics().setDepth(DEPTH.aura);
      this.collabFx.set(slot, fx);
    }
    return fx;
  }

  /** 투사체 일러스트는 고정하고, 진행 방향은 짧은 잔광으로 보여준다. */
  private drawProjectileTrails() {
    const fx = this.projectileTrails ??= this.add.graphics().setDepth(DEPTH.proj - 1);
    fx.clear();
    for (const pr of this.projectiles.items) {
      if (!pr.active || (pr.tex !== 'shard' && pr.tex !== 'scatter' && pr.tex !== 'tempest')) continue;
      const color = pr.tex === 'scatter' ? 0xffd77a : 0xff9eb4;
      const width = pr.tex === 'tempest' ? 4 : 2;
      fx.lineStyle(width, color, 0.45).lineBetween(pr.x - pr.vx * 0.075, pr.y - pr.vy * 0.075, pr.x, pr.y);
      fx.lineStyle(1, 0xfff1c2, 0.78).lineBetween(pr.x - pr.vx * 0.04, pr.y - pr.vy * 0.04, pr.x, pr.y);
    }
  }

  /** 선택 1: 정지 스프라이트 대신 작은 털실·빛 입자가 소용돌이친다. */
  private drawTornado(slot: number, s: WeaponStats, time: number) {
    const fx = this.collabGraphic(slot);
    const p = this.player;
    fx.clear();
    const count = 34 + ((s.stacks ?? 1) - 1) * 8;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const a = t * Math.PI * 5 + time * 0.006;
      const r = s.area * (0.22 + t * 0.9);
      fx.fillStyle(i % 3 ? 0xff9eb4 : 0xffdd82, 0.35 + t * 0.45)
        .fillCircle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.62, 2 + (i % 3));
    }
  }

  /** 선택 3: 결계의 실제 범위를 읽기 쉬운 동심 파동으로 표현한다. */
  private drawBarrier(slot: number, s: WeaponStats, time: number) {
    const fx = this.collabGraphic(slot);
    const p = this.player;
    fx.clear();
    const rings = 3 + (s.stacks ?? 1) - 1;
    for (let i = 0; i < rings; i++) {
      const phase = (time * 0.00045 + i / rings) % 1;
      fx.lineStyle(3 - i * 0.5, i === 1 ? 0xffd77a : 0xff8faa, 0.75 - phase * 0.55)
        .strokeCircle(p.x, p.y, s.area * (0.48 + phase * 0.52));
    }
  }

  /** 펄스: 실제 범위 안쪽을 순환하는 얇은 파동으로 틱 리듬을 전달한다. */
  private drawPulse(slot: number, s: WeaponStats, time: number) {
    const fx = this.collabGraphic(slot);
    const p = this.player;
    const phase = (time * 0.0014) % 1;
    fx.clear();
    fx.lineStyle(2, 0xff9eb4, 0.7 - phase * 0.55).strokeCircle(p.x, p.y, s.area * (0.22 + phase * 0.7));
  }

  /* ---------------------------------------------------------------- */

  private damageEnemy(e: Enemy, amount: number, kx: number, ky: number, knockback: number) {
    e.hp -= amount;
    const resist = e.elite || e.kind === 'charger' ? 0.25 : 1;
    e.knockX += kx * knockback * resist;
    e.knockY += ky * knockback * resist;

    if (e.flash <= 0) e.sprite.setTintFill(0xffffff);
    e.flash = 0.06;

    if (e.hp <= 0) {
      sfx.play('kill');
      this.spawnGem(e.x, e.y, e.xp * (e.gemTier ? 5 : 1), e.elite);
      if (this.player.hp < this.player.maxHp && Math.random() < meta.healDropChance()) {
        this.spawnGem(e.x, e.y, 0, false, true);
      }
      this.kills++;
      if (e.eventTag === 'cart' && --this.cartRemaining <= 0) this.finishCart(e.x, e.y);
      if (e.eventTag === 'burrow') this.finishBurrow(e.x, e.y);
      this.enemies.release(e);
      if (e.boss) this.onClear(e.x, e.y);
    }
    else sfx.play('hit');
  }

  private finishCart(x: number, y: number) {
    for (let i = 0; i < 3; i++) this.spawnGem(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, 25, false);
    if (Math.random() < 0.25) this.spawnGem(x, y, 0, false, true);
    const gold = Math.floor(150 * this.goldMult);
    this.earnedGold += gold;
    meta.earn(gold);
    bus.emit(EV.mapEvent, `치즈 수레 보상 +${gold}G`);
  }

  private finishBurrow(x: number, y: number) {
    for (let i = 0; i < 2; i++) this.spawnGem(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, 25, false);
    if (Math.random() < 0.35) this.spawnGem(x, y, 0, false, true);
  }

  private spawnGem(x: number, y: number, xp: number, big: boolean, heal = false) {
    let g = this.gems.spawn();
    if (!g) {
      if (heal) return;
      // 풀이 가득 찼다 — 도망 다니면 젬이 바닥에 계속 쌓이므로 실제로 일어난다.
      // 그냥 버리면 경험치가 소리 없이 증발하니, 가장 먼 젬을 재활용하고 경험치는 합친다.
      g = this.farthestGem();
      if (!g) return;
      xp += g.xp;
      big = big || g.xp > 4;
    }
    g.x = x;
    g.y = y;
    g.vx = (Math.random() - 0.5) * 40;
    g.vy = (Math.random() - 0.5) * 40;
    g.xp = xp;
    g.attracted = false;
    g.big = big;
    g.heal = heal;
    g.sprite.setTexture(this.gemTexture(g));
    this.scaleTo(g.sprite, this.gemDisplaySize(g));
    g.sprite.setVisible(true);
  }

  private gemTexture(g: Gem) {
    if (g.heal) return TEX.heal;
    if (g.big) return TEX.gemBoss;
    if (g.xp >= 25) return TEX.gemLarge;
    if (g.xp >= 5) return TEX.gemMedium;
    return TEX.gemSmall;
  }

  private gemDisplaySize(g: Gem) {
    if (g.heal) return 24;
    // 생성 시트는 각 칸에서 아트가 차지하는 비율이 다르므로, 프레임 크기 대신
    // 실제 실루엣이 20~55px로 읽히도록 등급별 보정값을 사용한다.
    if (g.big) return 70;
    if (g.xp >= 25) return 62;
    if (g.xp >= 5) return 58;
    return 64;
  }

  private refreshGemSprite(g: Gem) {
    g.sprite.setTexture(this.gemTexture(g));
    this.scaleTo(g.sprite, this.gemDisplaySize(g));
  }

  /** ponytail: 0.8초마다 최대 900개만 비교한다; 더 큰 젬 풀이 필요해지면 셀 해시로 교체. */
  private mergeLooseGems() {
    const items = this.gems.items;
    for (let i = 0; i < items.length; i++) {
      const base = items[i];
      if (!base.active || base.attracted || base.heal || base.big || base.xp >= 25) continue;
      const matches: Gem[] = [base];
      for (let j = i + 1; j < items.length && matches.length < 5; j++) {
        const other = items[j];
        if (!other.active || other.attracted || other.heal || other.big || other.xp !== base.xp) continue;
        const dx = other.x - base.x;
        const dy = other.y - base.y;
        if (dx * dx + dy * dy <= 48 * 48) matches.push(other);
      }
      if (matches.length < 5) continue;
      base.xp *= 5;
      for (let n = 1; n < matches.length; n++) this.gems.release(matches[n]);
      this.refreshGemSprite(base);
    }
  }

  private farthestGem(): Gem | null {
    const p = this.player;
    const items = this.gems.items;
    let best: Gem | null = null;
    let bestD = -1;
    for (let i = 0; i < items.length; i++) {
      const g = items[i];
      if (!g.active) continue;
      const dx = g.x - p.x;
      const dy = g.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > bestD) {
        bestD = d2;
        best = g;
      }
    }
    return best;
  }

  private stepGems(dt: number) {
    const p = this.player;
    const items = this.gems.items;
    const magnet2 = p.magnet * p.magnet;
    const pick = PLAYER.pickupRadius;
    const drag = Math.exp(-6 * dt);

    for (let i = 0; i < items.length; i++) {
      const g = items[i];
      if (!g.active) continue;

      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy);

      if (!g.attracted && d * d <= magnet2) g.attracted = true;

      if (g.attracted) {
        // 속도를 매 프레임 플레이어 쪽으로 다시 조준한다.
        //
        // 예전에는 플레이어 방향 가속만 더했는데, 그러면 옆으로 가는 속도가
        // 그대로 남아서 젬이 궤도를 돌기만 하고 안 먹혔다(중력 궤도와 같은 원리).
        // 플레이어가 움직일수록 심해져서, 원을 그리며 도는 플레이에서는
        // 젬의 25~70%가 10초 안에 회수되지 않았다.
        const sp = Math.min(Math.hypot(g.vx, g.vy) + GEM.pullAccel * dt, GEM.pullMax);
        const inv = d > 0.0001 ? 1 / d : 0;
        g.vx = dx * inv * sp;
        g.vy = dy * inv * sp;
      } else {
        g.vx *= drag;
        g.vy *= drag;
      }

      const step = Math.hypot(g.vx, g.vy) * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;

      // 이번 프레임 이동거리가 남은 거리보다 크면 플레이어를 지나쳤다는 뜻이다.
      // 최고 속도에서 프레임당 17px 을 움직이므로, 거리만 보면
      // 수집 반경 16px 을 그냥 건너뛰어 버린다(터널링).
      if (d <= pick || step >= d) {
        sfx.play('pickup');
        if (g.heal) p.hp = Math.min(p.maxHp, p.hp + meta.healAmount());
        else this.gainXp(g.xp);
        this.gems.release(g);
      }
    }
  }

  private gainXp(amount: number) {
    const p = this.player;
    p.xp += amount * p.xpMult * this.gemXpMult;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = xpForLevel(p.level);
      this.pendingLevels++;
    }
  }

  private stepPlayerDamage() {
    const p = this.player;
    if (p.invuln > 0) return;

    const items = this.enemies.items;
    const buf = this.hash.query(p.x, p.y, PLAYER.radius + 40, this.qbuf);

    let worst = 0;
    let contacts = 0;
    for (let n = 0; n < buf.length; n++) {
      const e = items[buf[n]];
      if (!e.active) continue;
      const rr = PLAYER.radius + e.radius;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > rr * rr) continue;
      contacts++;
      if (e.damage > worst) worst = e.damage;
    }

    if (worst > 0) {
      sfx.play('hurt');
      const pressure = Math.min(4, 1 + (contacts - 1) * 0.2);
      p.hp -= Math.max(1, worst * pressure - p.armor);
      p.invuln = PLAYER.invulnTime;
      this.cameras.main.shake(120, 0.006);
    }
  }

  /* ---------------------------------------------------------------- */
  /* 렌더 반영                                                          */
  /* ---------------------------------------------------------------- */

  private render() {
    const p = this.player;
    const walkFrame = Math.floor(this.elapsed * 10) % 4;
    const playerTex = this.playerMoving ? TEX.playerWalk(walkFrame) : TEX.player;
    if (this.playerSprite.texture.key !== playerTex) this.playerSprite.setTexture(playerTex);
    this.playerSprite.setPosition(p.x, p.y);
    // 원본 걷기 프레임은 왼쪽을 향한다. 오른쪽으로 갈 때만 뒤집는다.
    this.playerSprite.setFlipX(this.aimX > 0);
    // 무적 표시는 깜빡임으로. alpha 를 계속 낮춰두면 적에게 둘러싸여 연속 피격될 때
    // 내 캐릭터가 어두운 배경에 묻혀서 안 보인다.
    this.playerSprite.setAlpha(
      p.invuln > 0 && Math.floor(p.invuln * 16) % 2 === 0 ? 0.5 : 1,
    );

    const cam = this.cameras.main;
    this.ground.setTilePosition(cam.scrollX, cam.scrollY);

    const es = this.enemies.items;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (!e.active) continue;
      const tex = TEX.enemyWalk(e.kind, walkFrame);
      if (e.boss) e.sprite.setTexture('asset:boss:sheet', walkFrame);
      else if (e.kind === 'burrow' || e.kind === 'charger') e.sprite.setTexture('asset:burrow:sheet', walkFrame);
      else if (e.kind === 'slinger') e.sprite.setTexture('asset:slinger:sheet', walkFrame);
      else if (e.sprite.texture.key !== tex) e.sprite.setTexture(tex);
      // 쥐 원본도 왼쪽을 향한다. 플레이어가 오른쪽에 있을 때만 뒤집는다.
      e.sprite.setFlipX(this.player.x > e.x);
      e.sprite.setPosition(e.x, e.y);
    }
    this.drawBossWarning(es);
    const ps = this.projectiles.items;
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].active) ps[i].sprite.setPosition(ps[i].x, ps[i].y);
    }
    const gs = this.gems.items;
    for (let i = 0; i < gs.length; i++) {
      if (gs[i].active) gs[i].sprite.setPosition(gs[i].x, gs[i].y);
    }
  }

  /** 최종 보스의 근접 충격파 반경과 다음 발동까지의 충전량을 표시한다. */
  private drawBossWarning(enemies: Enemy[]) {
    const fx = this.bossFx ??= this.add.graphics().setDepth(DEPTH.aura);
    fx.clear();
    const now = this.elapsed * 1000;
    for (const e of enemies) {
      if (!e.active || !e.boss) continue;
      const progress = Phaser.Math.Clamp(1 - Math.max(0, e.hitAt[7] - now) / 1600, 0, 1);
      fx.fillStyle(0x70bfff, 0.045).fillCircle(e.x, e.y, 260);
      fx.lineStyle(3, 0x83ceff, 0.86).strokeCircle(e.x, e.y, 260);
      fx.lineStyle(7, 0xff5f78, 0.96).beginPath()
        .arc(e.x, e.y, 248, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false).strokePath();
    }
  }

  private emitHud() {
    const p = this.player;
    const h = this.hud;
    h.hp = p.hp;
    h.maxHp = p.maxHp;
    h.level = p.level;
    h.xp = p.xp;
    h.xpNext = p.xpNext;
    h.time = this.elapsed;
    h.kills = this.kills;
    h.enemies = this.enemies.live;
    bus.emit(EV.stats, h);
  }

  /* ---------------------------------------------------------------- */
  /* 흐름 제어                                                          */
  /* ---------------------------------------------------------------- */

  private openLevelUp() {
    const choices = this.prog.rollChoices(Math.random);
    if (choices.length === 0) {
      this.pendingLevels = 0;
      this.openAbyssContract();
      return;
    }
    this.awaitingChoice = true;
    sfx.play('levelup');
    bus.emit(EV.levelup, { choices, level: this.player.level });
    this.scene.pause();
  }

  /** 빌드가 끝난 뒤 5레벨마다 계약 게이지를 채우고, 10레벨/2분마다 한 번만 제시한다. */
  private openAbyssContract() {
    if (!this.abyssNextLevel) this.abyssNextLevel = (Math.floor(this.player.level / 5) + 1) * 5;
    while (this.player.level >= this.abyssNextLevel) {
      this.abyssCharges++;
      this.abyssNextLevel += 5;
    }
    if (this.abyssCharges < 2 || this.elapsed < this.lastAbyssAt + 120) return;
    this.abyssCharges -= 2;
    this.lastAbyssAt = this.elapsed;
    this.awaitingChoice = true;
    bus.emit(EV.mutationChoice, { choices: this.abyssChoices(), stage: this.abyssContracts + 1, abyss: true });
    this.scene.pause();
  }

  private onPicked(choice: Choice) {
    if (choice.kind === 'collab') this.clearWeaponVisuals();
    sfx.play('pickup');
    this.prog.apply(choice, this.player);
    this.applyRareBonuses();
    this.pendingLevels--;
    this.awaitingChoice = false;
    this.scene.resume();
  }

  private onRarePicked(choice: RareChoice) {
    const power = meta.rarePower();
    if (choice.id === 'crown') this.rareDamageMult *= 1 + 0.35 * power;
    if (choice.id === 'heart') this.rareHpMult *= 1 + 0.25 * power;
    if (choice.id === 'moon') { this.rareSpeedMult *= 1 + 0.2 * power; this.rareMagnetMult *= 1 + 0.35 * power; }
    if (choice.id === 'comet') this.rareCooldownMult *= 1 - 0.25 * power;
    this.prog.applyPassives(this.player);
    this.applyRareBonuses(choice.id === 'heart');
    this.awaitingChoice = false;
    this.scene.resume();
  }

  private applyRareBonuses(fullHeal = false) {
    const p = this.player;
    const before = p.maxHp;
    p.maxHp *= this.rareHpMult;
    p.hp = fullHeal ? p.maxHp : Math.min(p.maxHp, p.hp + Math.max(0, p.maxHp - before));
    p.damageMult *= this.rareDamageMult;
    p.speed *= this.rareSpeedMult;
    p.magnet *= this.rareMagnetMult;
    p.cooldownMult *= this.rareCooldownMult;
  }

  private onMutationPicked(choice: MutationChoice) {
    if (choice.id.startsWith('abyss')) {
      this.enemyDamageMult *= 1.12;
      if (choice.id === 'abyssRush') { this.chargerWeightMult *= 1.75; this.goldMult *= 1.35; }
      if (choice.id === 'abyssVolley') { this.slingerWeightMult *= 1.8; this.gemXpMult *= 1.25; }
      if (choice.id === 'abyssHunt') { this.enemyHpMult *= 1.25; this.goldMult *= 1.45; this.nextEliteAt = Math.min(this.nextEliteAt, this.elapsed + 15); }
      this.abyssContracts++;
      this.awaitingChoice = false;
      bus.emit(EV.mapEvent, `심연 계약 ${this.abyssContracts}: ${choice.name}`);
      this.scene.resume();
      return;
    }
    this.enemyDamageMult *= 1.15;
    if (choice.id === 'march') { this.spawnMult *= 1.35; this.goldMult *= 1.25; }
    if (choice.id === 'redMoon') { this.enemyDamageMult *= 1.25; this.goldMult *= 1.3; this.nextEliteAt = Math.min(this.nextEliteAt, this.elapsed + 15); }
    if (choice.id === 'harvest') { this.enemyHpMult *= 1.25; this.gemXpMult *= 1.5; this.goldMult *= 1.2; }
    this.mutationCount++;
    this.lastAbyssAt = this.elapsed;
    this.awaitingChoice = false;
    bus.emit(EV.mapEvent, `변이 ${this.mutationCount}: ${choice.name}`);
    this.scene.resume();
  }

  /**
   * ESC 일시정지.
   *
   * 해제는 UIScene 이 맡는다 — 씬을 pause 하면 그 씬의 키보드 플러그인도
   * 같이 멈춰서, 여기 등록한 ESC 리스너는 정지 중에 아예 발화하지 않는다.
   * 레벨업 카드 / 게임오버와 같은 구조다.
   */
  private onPause() {
    if (this.dead || this.awaitingChoice) return;

    // 여기에 "해제 직후 재정지 방지" 프레임 가드를 뒀었는데 빼버렸다.
    // Phaser 는 키 이벤트를 프레임이 아니라 네이티브 이벤트 시점에 동기로 뿌리고,
    // 정지 중에는 이 씬의 키보드가 비활성이라 같은 입력이 양쪽에 갈 수가 없다.
    // 즉 이중 발화는 구조적으로 불가능한데, 가드는 프레임이 느려지면
    // 정상적인 ESC 까지 막아버리는 실패 모드만 만들었다.
    sfx.play('pause');
    bus.emit(EV.pause, {
      time: this.elapsed,
      kills: this.kills,
      level: this.player.level,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      loadout: this.prog.loadout(),
    });
    this.scene.pause();
  }

  private onCycleRate() {
    const rates = [1, 1.5, 2, 3].filter((rate) => rate <= meta.maxRate());
    bus.emit(EV.speed, rates[(rates.indexOf(this.rate) + 1) % rates.length]);
  }

  private onRate(rate: number) {
    this.rate = Math.min(rate, meta.maxRate());
  }

  private onResume() {
    this.scene.resume();
  }

  private onOvertime() {
    this.overtime = true;
    this.nextEliteAt = Math.min(this.nextEliteAt, this.elapsed + 30);
    this.nextMutationAt = Math.max(OVERTIME_TIME, (Math.floor(this.elapsed / 300) + 1) * 300);
    this.scene.resume();
  }

  private onDeath(aborted = false) {
    this.dead = true;
    const score = this.runScore();
    const gold = Math.max(0, Math.floor((this.kills * 0.05 + this.elapsed * 0.5) * this.goldMult) - this.earnedGold);
    meta.earn(gold);
    const rewards = this.finishMeta(false, score);
    bus.emit(EV.gameover, {
      time: this.elapsed,
      kills: this.kills,
      level: this.player.level,
      gold,
      aborted,
      recordRank: rewards.recordRank, bestTime: meta.bestTime(), score, mutations: rewards.mutations,
      masteryGain: rewards.masteryGain, masteryLevel: rewards.masteryLevel, prestigeXp: rewards.prestigeXp, moonSeals: rewards.seals, challenges: rewards.challenges,
    });
    this.scene.pause();
  }

  private onClear(x = this.player.x, y = this.player.y) {
    if (this.cleared) return;
    this.cleared = true;
    for (let i = 0; i < 3; i++) this.spawnGem(x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 70, 25, false);
    const score = this.runScore();
    const gold = Math.floor((this.kills * 0.05 + this.elapsed * 0.5 + 1000) * this.goldMult);
    this.earnedGold += gold;
    meta.earn(gold);
    const rewards = this.finishMeta(true, score);
    bus.emit(EV.gameover, { time: this.elapsed, kills: this.kills, level: this.player.level, gold, cleared: true, recordRank: rewards.recordRank, bestTime: meta.bestTime(), score, mutations: rewards.mutations, masteryGain: rewards.masteryGain, masteryLevel: rewards.masteryLevel, prestigeXp: rewards.prestigeXp, moonSeals: rewards.seals, challenges: rewards.challenges });
    this.scene.pause();
  }

  private runScore() { return Math.floor((this.kills + this.elapsed * 10) * (1 + (this.mutationCount + this.abyssContracts) * 0.25)); }

  private finishMeta(cleared: boolean, score: number) {
    const mutations = this.mutationCount + this.abyssContracts;
    const run = { time: this.elapsed, kills: this.kills, level: this.player.level, cleared, score, mutations, character: selectedCharacter.id };
    const legacy = meta.completeRun(selectedCharacter.id, run);
    return { ...legacy, mutations, recordRank: meta.record(run) };
  }

  private onRestart() {
    this.scene.resume();
    this.scene.restart();
  }

  private onMenu() {
    this.scene.stop('UI');
    this.scene.start('CharacterSelect');
  }

  private onQuit() {
    if (!this.dead) this.onDeath(true);
  }

  private onResize() {
    this.ground.setSize(VIEW.width, VIEW.height);
  }

  /**
   * 테마 전환. 텍스처 키는 그대로 두고 내용만 다시 굽기 때문에
   * 각 스프라이트에 setTexture 를 한 번 더 호출해 프레임 참조만 갱신하면 된다.
   */
  private onCycleTheme() {
    const theme = cycleTheme();
    buildTextures(this, theme);
    this.cameras.main.setBackgroundColor(theme.bg);

    // 텍스처를 새 테마 것으로 바꾸고, 크기가 달라졌을 수 있으니 스케일도 다시 맞춘다.
    this.playerSprite.setTexture(TEX.player);
    this.applyPlayerScale();

    for (const e of this.enemies.items) {
      e.sprite.setTexture(e.boss ? 'asset:boss:sheet' : e.kind === 'burrow' || e.kind === 'charger' ? 'asset:burrow:sheet' : e.kind === 'slinger' ? 'asset:slinger:sheet' : TEX.enemy(e.kind));
      if (e.boss) e.sprite.setScale(150 / 627);
      else if (e.kind === 'burrow' || e.kind === 'charger') e.sprite.setScale(80 / 768);
      else if (e.kind === 'slinger') e.sprite.setScale(52 / 543);
      else this.scaleTo(e.sprite, this.enemyDisplaySize(e.kind, e.radius));
    }
    for (const g of this.gems.items) {
      this.refreshGemSprite(g);
    }
    for (const pr of this.projectiles.items) {
      pr.sprite.setTexture(TEX.proj(pr.tex));
      this.scaleTo(pr.sprite, theme.projectiles[pr.tex].size);
    }
    for (const w of this.prog.weapons) {
      const arr = this.weaponVisuals.get(w.slot);
      if (arr) for (const img of arr) img.setTexture(TEX.proj(w.def.tex));
    }

    this.ground.destroy();
    this.ground = this.add
      .tileSprite(0, 0, VIEW.width, VIEW.height, this.backgroundKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.ground);

    bus.emit(EV.themeChanged, theme);
  }
}
