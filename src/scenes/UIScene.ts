import Phaser from 'phaser';
import { VIEW } from '../config';
import { EV, bus } from '../bus';
import { TEX, getTheme } from '../theme';
import { meta } from '../systems/MetaProgression';
import type { Choice, GameOverStats, HudStats, MutationChoice, PauseStats, RareChoice } from '../types';

const FONT = '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif';

const CARD = { w: 250, h: 210, gap: 22 };

const fmtTime = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export class UIScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private timeText!: Phaser.GameObjects.Text;
  private statText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Container | null = null;
  private accent = 0x4fd1ff;
  private latestStats?: HudStats;
  private overlayType?: 'levelup' | 'pause' | 'gameover' | 'mutation';
  private levelupPayload?: { choices: Choice[]; level: number };
  private pauseStats?: PauseStats;
  private gameOverStats?: GameOverStats;
  private mutationPayload?: { choices: MutationChoice[]; stage: number };
  private rate = 1;
  private levelupInputReady = true;
  private rareInputReady = true;

  constructor() {
    super({ key: 'UI', active: false });
  }

  create() {
    this.accent = getTheme().hudAccent;

    this.bars = this.add.graphics().setDepth(100);

    this.timeText = this.add
      .text(VIEW.width / 2, 14, '00:00', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    this.statText = this.add
      .text(12, 44, '', { fontFamily: FONT, fontSize: '14px', color: '#c9d3e0' })
      .setDepth(101);

    this.speedText = this.add
      .text(VIEW.width - 12, 14, '1×', { fontFamily: FONT, fontSize: '16px', color: '#8dceff', backgroundColor: '#232c3b', padding: { x: 8, y: 4 } })
      .setOrigin(1, 0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.overlay) return;
        const rates = [1, 1.5, 2, 3].filter((rate) => rate <= meta.maxRate());
        bus.emit(EV.speed, rates[(rates.indexOf(this.rate) + 1) % rates.length]);
      });

    this.pauseText = this.add
      .text(VIEW.width - 62, 14, 'Ⅱ', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#232c3b', padding: { x: 10, y: 3 } })
      .setOrigin(0.5, 0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!this.overlay) bus.emit(EV.pauseRequest);
      });

    this.helpText = this.add
      .text(VIEW.width - 12, VIEW.height - 10, 'WASD / 방향키 · 화면 드래그 이동 · F/배속 버튼 · ESC/Ⅱ 일시정지', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#6f7c8f',
      })
      .setOrigin(1, 1)
      .setDepth(101);

    bus.on(EV.stats, this.onStats, this);
    bus.on(EV.levelup, this.onLevelUp, this);
    bus.on(EV.rareChoice, this.onRareChoice, this);
    bus.on(EV.mapEvent, this.onMapEvent, this);
    bus.on(EV.mutationChoice, this.onMutationChoice, this);
    bus.on(EV.pause, this.onPause, this);
    bus.on(EV.speed, this.onRate, this);
    bus.on(EV.gameover, this.onGameOver, this);
    bus.on(EV.themeChanged, this.onThemeChanged, this);
    bus.on(EV.resize, this.onResize, this);
    this.onResize();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EV.stats, this.onStats, this);
      bus.off(EV.levelup, this.onLevelUp, this);
      bus.off(EV.rareChoice, this.onRareChoice, this);
      bus.off(EV.mapEvent, this.onMapEvent, this);
      bus.off(EV.mutationChoice, this.onMutationChoice, this);
      bus.off(EV.pause, this.onPause, this);
      bus.off(EV.speed, this.onRate, this);
      bus.off(EV.gameover, this.onGameOver, this);
      bus.off(EV.themeChanged, this.onThemeChanged, this);
      bus.off(EV.resize, this.onResize, this);
    });
  }

  private onThemeChanged() {
    this.accent = getTheme().hudAccent;
  }

  private onRate(rate: number) {
    this.rate = rate;
    this.speedText.setText(`${rate}×`);
  }

  /* ---------------------------------------------------------------- */
  /* HUD                                                               */
  /* ---------------------------------------------------------------- */

  private onStats(s: HudStats) {
    this.latestStats = s;
    const g = this.bars;
    g.clear();

    // 경험치 바 (상단 전체 폭)
    const xpW = VIEW.width;
    g.fillStyle(0x0d1018, 0.9).fillRect(0, 0, xpW, 8);
    g.fillStyle(this.accent, 1).fillRect(0, 0, xpW * Phaser.Math.Clamp(s.xp / s.xpNext, 0, 1), 8);

    // 체력 바
    const hpW = Math.min(200, VIEW.width * 0.45);
    g.fillStyle(0x0d1018, 0.9).fillRect(12, 18, hpW, 16);
    g.fillStyle(0xd94a4a, 1).fillRect(12, 18, hpW * Phaser.Math.Clamp(s.hp / s.maxHp, 0, 1), 16);
    g.lineStyle(1, 0x2a3242, 1).strokeRect(12, 18, hpW, 16);

    this.timeText.setText(fmtTime(s.time));

    this.statText.setText(
      `Lv ${s.level}   처치 ${s.kills}   적 ${s.enemies}   HP ${Math.max(0, Math.ceil(s.hp))}/${Math.round(s.maxHp)}`,
    );
  }

  private onResize() {
    const compact = VIEW.width < 600;
    this.timeText.setPosition(compact ? VIEW.width - 12 : VIEW.width / 2, 14).setOrigin(compact ? 1 : 0.5, 0);
    this.speedText.setPosition(compact ? 12 : VIEW.width - 12, compact ? 68 : 14).setOrigin(compact ? 0 : 1, 0);
    this.pauseText.setPosition(compact ? 64 : VIEW.width - 68, compact ? 68 : 14);
    this.statText.setFontSize(compact ? 12 : 14);
    this.helpText.setPosition(VIEW.width - 12, VIEW.height - 10).setVisible(!compact);
    if (this.latestStats) this.onStats(this.latestStats);
    if (this.overlayType === 'levelup' && this.levelupPayload) this.onLevelUp(this.levelupPayload);
    if (this.overlayType === 'pause' && this.pauseStats) this.onPause(this.pauseStats);
    if (this.overlayType === 'gameover' && this.gameOverStats) this.onGameOver(this.gameOverStats);
    if (this.overlayType === 'mutation' && this.mutationPayload) this.onMutationChoice(this.mutationPayload);
  }

  /* ---------------------------------------------------------------- */
  /* 레벨업 선택 화면                                                    */
  /* ---------------------------------------------------------------- */

  private onLevelUp(payload: { choices: Choice[]; level: number }) {
    this.clearOverlay();
    this.overlayType = 'levelup';
    this.levelupPayload = payload;
    const c = this.add.container(0, 0).setDepth(200);
    this.overlay = c;
    this.levelupInputReady = !this.input.activePointer.isDown;
    if (!this.levelupInputReady) {
      this.input.once('pointerup', () => this.time.delayedCall(0, () => {
        if (this.overlay === c) this.levelupInputReady = true;
      }));
    }

    const dim = this.add.graphics();
    dim.fillStyle(0x05070c, 0.82).fillRect(0, 0, VIEW.width, VIEW.height);
    c.add(dim);

    const n = payload.choices.length;
    const totalW = n * CARD.w + (n - 1) * CARD.gap;
    const stacked = VIEW.width < totalW + 32;
    const gap = stacked ? 12 : CARD.gap;
    const scale = stacked
      ? Math.min(1, (VIEW.width - 32) / CARD.w, (VIEW.height - 145 - (n - 1) * gap) / (n * CARD.h))
      : Phaser.Math.Clamp(Math.min(VIEW.width / 960, VIEW.height / 540), 1, 1.5);
    const cardsH = stacked ? n * CARD.h * scale + (n - 1) * gap : CARD.h * scale;
    const y = stacked
      ? Math.max(130, (VIEW.height - cardsH) / 2)
      : VIEW.height / 2 - cardsH / 2 + 40 * scale;
    const startX = stacked
      ? (VIEW.width - CARD.w * scale) / 2
      : (VIEW.width - totalW * scale) / 2;
    const headingScale = stacked ? 1 : scale;

    c.add(
      this.add
        .text(VIEW.width / 2, stacked ? 78 : y - 104 * scale, `레벨 ${payload.level}`, {
          fontFamily: FONT,
          fontSize: `${38 * headingScale}px`,
          color: '#ffffff',
        })
        .setOrigin(0.5),
    );
    c.add(
      this.add
        .text(VIEW.width / 2, stacked ? 118 : y - 58 * scale, '하나를 선택하세요  ( 1 · 2 · 3 )', {
          fontFamily: FONT,
          fontSize: `${15 * headingScale}px`,
          color: '#8d9ab0',
        })
        .setOrigin(0.5),
    );

    payload.choices.forEach((choice, i) => {
      const x = stacked ? startX : startX + i * (CARD.w + CARD.gap) * scale;
      const cardY = stacked ? y + i * (CARD.h * scale + gap) : y;
      c.add(this.makeCard(choice, x, cardY, i).setScale(scale));
    });

    const keys = ['ONE', 'TWO', 'THREE'] as const;
    payload.choices.forEach((choice, i) => {
      this.bindOverlayKey(`keydown-${keys[i]}`, () => this.pick(choice));
    });
  }

  private makeCard(choice: Choice, x: number, y: number, i: number) {
    const c = this.add.container(x, y);

    const bg = this.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x1b2434 : 0x121824, 1).fillRoundedRect(0, 0, CARD.w, CARD.h, 10);
      bg.lineStyle(2, hover ? this.accent : 0x2b3547, 1).strokeRoundedRect(0, 0, CARD.w, CARD.h, 10);
    };
    draw(false);
    c.add(bg);

    const badge = choice.kind === 'collab' ? '콜라보 진화'
      : choice.kind === 'weapon-new' ? '신규 무기' : choice.kind === 'weapon-up' ? '무기 강화' : '패시브';

    c.add(
      this.add.text(16, 16, `${i + 1}`, {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#5d6b80',
      }),
    );
    c.add(
      this.add
        .text(CARD.w - 16, 16, badge, {
          fontFamily: FONT,
          fontSize: '12px',
          color: '#7f8ea6',
        })
        .setOrigin(1, 0),
    );

    if (choice.tex) {
      // 텍스처는 슈퍼샘플링돼 있으므로 실제 폭을 보고 표시 크기를 맞춘다.
      const icon = this.add.image(CARD.w / 2, 76, TEX.proj(choice.tex));
      const src = icon.texture.getSourceImage();
      if (src.width > 0) icon.setScale(34 / src.width);
      c.add(icon);
    }

    c.add(
      this.add
        .text(CARD.w / 2, 118, choice.name, {
          fontFamily: FONT,
          fontSize: '22px',
          color: '#ffffff',
        })
        .setOrigin(0.5),
    );

    c.add(
      this.add
        .text(CARD.w / 2, 146, `Lv ${choice.level} / ${choice.maxLevel}`, {
          fontFamily: FONT,
          fontSize: '13px',
          color: '#7f8ea6',
        })
        .setOrigin(0.5),
    );

    c.add(
      this.add
        .text(CARD.w / 2, 178, choice.detail, {
          fontFamily: FONT,
          fontSize: '13px',
          color: '#b9c6d8',
          align: 'center',
          wordWrap: { width: CARD.w - 28 },
        })
        .setOrigin(0.5),
    );

    const zone = this.add
      .zone(0, 0, CARD.w, CARD.h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => {
      if (this.levelupInputReady) this.pick(choice);
    });
    c.add(zone);

    return c;
  }

  private pick(choice: Choice) {
    this.clearOverlay();
    bus.emit(EV.picked, choice);
  }

  private onRareChoice(payload: { choices: RareChoice[] }) {
    this.clearOverlay();
    const c = this.add.container(0, 0).setDepth(200);
    this.overlay = c;
    this.rareInputReady = !this.input.activePointer.isDown;
    if (!this.rareInputReady) this.input.once('pointerup', () => this.time.delayedCall(0, () => {
      if (this.overlay === c) this.rareInputReady = true;
    }));
    const dim = this.add.graphics().fillStyle(0x13091b, 0.88).fillRect(0, 0, VIEW.width, VIEW.height);
    c.add(dim);
    const scale = Phaser.Math.Clamp(Math.min(VIEW.width / 960, VIEW.height / 540), 0.58, 1.1);
    c.add(this.add.text(VIEW.width / 2, 74 * scale, '희귀 선택', { fontFamily: FONT, fontSize: `${38 * scale}px`, color: '#ffd36b' }).setOrigin(0.5));
    c.add(this.add.text(VIEW.width / 2, 112 * scale, '털실 제단이 축복을 내립니다', { fontFamily: FONT, fontSize: `${15 * scale}px`, color: '#f2afd3' }).setOrigin(0.5));
    const cardW = 220 * scale; const cardH = 210 * scale; const gap = 18 * scale;
    const start = VIEW.width / 2 - (cardW * 3 + gap * 2) / 2;
    payload.choices.forEach((choice, i) => {
      const x = start + i * (cardW + gap); const y = VIEW.height / 2 - cardH / 2 + 20 * scale;
      const card = this.add.container(x, y);
      const bg = this.add.graphics().fillStyle(0x21182d, 1).fillRoundedRect(0, 0, cardW, cardH, 12).lineStyle(2, 0xf2afd3, 0.9).strokeRoundedRect(0, 0, cardW, cardH, 12);
      card.add(bg);
      const icon = this.add.image(cardW / 2, 65 * scale, 'asset:rare:sheet', choice.frame); const src = icon.texture.getSourceImage(); if (src.width) icon.setScale(48 * scale / src.width); card.add(icon);
      card.add(this.add.text(cardW / 2, 116 * scale, choice.name, { fontFamily: FONT, fontSize: `${20 * scale}px`, color: '#fff4fa' }).setOrigin(0.5));
      card.add(this.add.text(cardW / 2, 160 * scale, choice.detail, { fontFamily: FONT, fontSize: `${13 * scale}px`, color: '#d7c4da', align: 'center', wordWrap: { width: cardW - 24 * scale } }).setOrigin(0.5));
      const zone = this.add.zone(0, 0, cardW, cardH).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        if (!this.rareInputReady) return;
        this.clearOverlay(); bus.emit(EV.rarePicked, choice);
      }); card.add(zone); c.add(card);
    });
  }

  private onMapEvent(name: string) {
    const text = this.add.text(VIEW.width / 2, 96, `◆ ${name} ◆`, {
      fontFamily: FONT, fontSize: '22px', color: '#ffd36b', stroke: '#120c18', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(150).setAlpha(0);
    this.tweens.add({ targets: text, alpha: 1, y: 112, duration: 260, yoyo: true, hold: 2200, onComplete: () => text.destroy() });
  }

  private onMutationChoice(payload: { choices: MutationChoice[]; stage: number }) {
    this.clearOverlay();
    this.overlayType = 'mutation';
    this.mutationPayload = payload;
    const c = this.add.container(0, 0).setDepth(200);
    this.overlay = c;
    const dim = this.add.graphics().fillStyle(0x08030d, 0.9).fillRect(0, 0, VIEW.width, VIEW.height);
    c.add(dim);
    const scale = Phaser.Math.Clamp(Math.min(VIEW.width / 960, VIEW.height / 540, (VIEW.width - 24) / 590), 0.5, 1);
    const w = 190 * scale; const h = 190 * scale; const gap = 10 * scale;
    const start = VIEW.width / 2 - (w * 3 + gap * 2) / 2;
    c.add(this.add.text(VIEW.width / 2, 78 * scale, `오버타임 변이 ${payload.stage}`, { fontFamily: FONT, fontSize: `${36 * scale}px`, color: '#ff8994' }).setOrigin(0.5));
    c.add(this.add.text(VIEW.width / 2, 114 * scale, '위험을 선택해 기록 보정을 높이세요', { fontFamily: FONT, fontSize: `${14 * scale}px`, color: '#d5a5b0' }).setOrigin(0.5));
    payload.choices.forEach((choice, i) => {
      const card = this.add.container(start + i * (w + gap), VIEW.height / 2 - h / 2 + 24 * scale);
      card.add(this.add.graphics().fillStyle(0x241521, 1).fillRoundedRect(0, 0, w, h, 12).lineStyle(2, 0xa64d5c, 1).strokeRoundedRect(0, 0, w, h, 12));
      card.add(this.add.text(w / 2, 52 * scale, choice.name, { fontFamily: FONT, fontSize: `${20 * scale}px`, color: '#fff0f1', align: 'center', wordWrap: { width: w - 18 } }).setOrigin(0.5));
      card.add(this.add.text(w / 2, 122 * scale, choice.detail, { fontFamily: FONT, fontSize: `${13 * scale}px`, color: '#e5bdc5', align: 'center', wordWrap: { width: w - 22 } }).setOrigin(0.5));
      const zone = this.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => { this.clearOverlay(); bus.emit(EV.mutationPicked, choice); });
      card.add(zone); c.add(card);
    });
  }

  /* ---------------------------------------------------------------- */
  /* 일시정지                                                           */
  /* ---------------------------------------------------------------- */

  private onPause(s: PauseStats) {
    this.clearOverlay();
    this.overlayType = 'pause';
    this.pauseStats = s;
    const c = this.add.container(0, 0).setDepth(200);
    this.overlay = c;

    const dim = this.add.graphics();
    dim.fillStyle(0x05070c, 0.94).fillRect(0, 0, VIEW.width, VIEW.height);
    c.add(dim);
    const scale = Phaser.Math.Clamp(Math.min(VIEW.width / 960, VIEW.height / 540), 0.58, 1.5);
    const panel = this.add
      .container(VIEW.width / 2 * (1 - scale), VIEW.height / 2 - 250 * scale)
      .setScale(scale);
    c.add(panel);

    panel.add(
      this.add
        .text(VIEW.width / 2, 62, '일시정지', {
          fontFamily: FONT, fontSize: '40px', color: '#ffffff',
        })
        .setOrigin(0.5),
    );
    panel.add(
      this.add
        .text(VIEW.width / 2, 108, `${fmtTime(s.time)}   ·   Lv ${s.level}   ·   처치 ${s.kills}   ·   HP ${Math.max(0, Math.ceil(s.hp))}/${Math.round(s.maxHp)}`, {
          fontFamily: FONT, fontSize: '15px', color: '#9aa7ba',
        })
        .setOrigin(0.5),
    );

    // 현재 빌드 — 일시정지에서 제일 보고 싶은 정보다
    panel.add(
      this.add
        .text(VIEW.width / 2, 152, '무기', { fontFamily: FONT, fontSize: '13px', color: '#6f7c8f' })
        .setOrigin(0.5),
    );
    const ws = s.loadout.weapons;
    const cell = Math.min(130, (VIEW.width - 120) / Math.max(1, ws.length));
    const startX = VIEW.width / 2 - ((ws.length - 1) * cell) / 2;
    ws.forEach((w, i) => {
      const x = startX + i * cell;
      const icon = this.add.image(x, 196, TEX.proj(w.tex));
      const src = icon.texture.getSourceImage();
      if (src.width > 0) icon.setScale(30 / src.width);
      panel.add(icon);
      panel.add(
        this.add
          .text(x, 226, `${w.name}`, { fontFamily: FONT, fontSize: '14px', color: '#e6edf6' })
          .setOrigin(0.5),
      );
      panel.add(
        this.add
          .text(x, 244, w.isCollab ? `중첩 ${w.stacks} / 5` : `Lv ${w.level} / ${w.maxLevel}`, {
            fontFamily: FONT, fontSize: '12px', color: '#7f8ea6',
          })
          .setOrigin(0.5),
      );
    });

    panel.add(
      this.add
        .text(VIEW.width / 2, 282, '패시브', { fontFamily: FONT, fontSize: '13px', color: '#6f7c8f' })
        .setOrigin(0.5),
    );
    const ps = s.loadout.passives;
    panel.add(
      this.add
        .text(
          VIEW.width / 2,
          312,
          ps.length ? ps.map((p) => `${p.name} Lv${p.level}`).join('    ') : '아직 없음',
          { fontFamily: FONT, fontSize: '15px', color: ps.length ? '#c9d3e0' : '#5d6b80' },
        )
        .setOrigin(0.5),
    );

    const resume = () => {
      this.clearOverlay();
      bus.emit(EV.resume);
    };
    const restart = () => {
      this.clearOverlay();
      bus.emit(EV.restart);
    };

    panel.add(this.makeButton(VIEW.width / 2 - 92, 392, '  이어하기  ', resume, true));
    panel.add(this.makeButton(VIEW.width / 2 + 92, 392, '  다시 시작  ', restart, false));
    panel.add(
      this.add
        .text(VIEW.width / 2, 444, 'ESC 로도 이어할 수 있습니다', {
          fontFamily: FONT, fontSize: '13px', color: '#5d6b80',
        })
        .setOrigin(0.5),
    );

    // 이 화면을 연 그 ESC 입력이 여기서도 잡히면 곧바로 다시 닫혀버린다.
    //
    // GameScene 의 pause 는 씬 큐로 처리돼 다음 프레임에야 반영되므로,
    // 정지를 건 그 네이티브 keydown 이 아직 살아 있는 UIScene 플러그인에도
    // 그대로 전달된다. 여기서 바로 해제 키를 걸면 같은 이벤트에 발화해서
    // "ESC 를 눌러도 아무 일도 안 일어나는" 증상이 된다.
    // 그래서 해제 키는 한 틱 뒤에, 그때까지 이 화면이 살아있을 때만 건다.
    this.time.delayedCall(0, () => {
      if (this.overlay === c) this.bindOverlayKey('keydown-ESC', resume);
    });
  }

  private makeButton(
    x: number, y: number, label: string, onClick: () => void, primary: boolean,
  ) {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '19px',
        color: primary ? '#0a0e16' : '#c9d3e0',
        backgroundColor: primary ? '#7fd4ff' : '#232c3b',
        padding: { x: 16, y: 11 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerup', onClick);
    return btn;
  }

  /* ---------------------------------------------------------------- */
  /* 게임 오버                                                          */
  /* ---------------------------------------------------------------- */

  private onGameOver(s: GameOverStats) {
    this.clearOverlay();
    this.overlayType = 'gameover';
    this.gameOverStats = s;
    const c = this.add.container(0, 0).setDepth(200);
    this.overlay = c;

    const dim = this.add.graphics();
    dim.fillStyle(0x05070c, 0.9).fillRect(0, 0, VIEW.width, VIEW.height);
    c.add(dim);
    const scale = Phaser.Math.Clamp(Math.min(VIEW.width / 960, VIEW.height / 540), 0.58, 1.5);
    const panel = this.add
      .container(VIEW.width / 2 * (1 - scale), VIEW.height / 2 - 280 * scale)
      .setScale(scale);
    c.add(panel);

    panel.add(
      this.add
        .text(VIEW.width / 2, 180, s.cleared ? '20분 완주!' : '사망', {
          fontFamily: FONT,
          fontSize: '52px',
          color: s.cleared ? '#ffd36b' : '#ff6b6b',
        })
        .setOrigin(0.5),
    );
    panel.add(
      this.add
        .text(
          VIEW.width / 2,
          252,
          `${s.cleared ? '쥐 군주를 물리쳤습니다!\n' : ''}생존 ${fmtTime(s.time)}   ·   처치 ${s.kills}   ·   레벨 ${s.level}\n골드 +${s.gold}`,
          { fontFamily: FONT, fontSize: '18px', color: '#c9d3e0' },
        )
        .setOrigin(0.5),
    );
    panel.add(this.add.text(VIEW.width / 2, 294, `점수 ${s.score ?? 0}   ·   변이 ${s.mutations ?? 0}   ·   개인 기록 #${s.recordRank || '-'}`, { fontFamily: FONT, fontSize: '14px', color: '#ffd36b' }).setOrigin(0.5));

    const restart = () => {
      this.clearOverlay();
      bus.emit(EV.restart);
    };
    this.bindOverlayKey('keydown-SPACE', restart);
    this.bindOverlayKey('keydown-ENTER', restart);
    if (s.cleared) {
      panel.add(this.makeButton(VIEW.width / 2, 350, '  오버타임 계속하기  ', () => {
        this.clearOverlay();
        bus.emit(EV.overtime);
      }, true));
    } else panel.add(this.makeButton(VIEW.width / 2, 350, '  다시 시작  ', restart, true));
    panel.add(this.makeButton(VIEW.width / 2, 412, '  성장 상점  ', () => {
      this.clearOverlay();
      bus.emit(EV.menu);
    }, false));

    panel.add(
      this.add
        .text(VIEW.width / 2, 444, 'Space / Enter', {
          fontFamily: FONT,
          fontSize: '13px',
          color: '#5d6b80',
        })
        .setOrigin(0.5),
    );
  }

  /**
   * 오버레이 전용 키 바인딩.
   *
   * 오버레이마다 once() 로 키를 걸어두는데, 그 키를 안 누르고 버튼으로 닫으면
   * 리스너가 그대로 남는다. 그러면 한참 뒤 다른 화면에서 그 키를 눌렀을 때
   * 엉뚱하게 발화한다(게임오버의 Space 가 살아남아 일시정지 중에 런을 날리는 식).
   * 그래서 등록한 키를 기록해두고 오버레이를 닫을 때 같이 지운다.
   */
  private overlayKeys: string[] = [];

  private bindOverlayKey(event: string, fn: () => void) {
    this.input.keyboard!.once(event, fn);
    this.overlayKeys.push(event);
  }

  private clearOverlay() {
    for (const ev of this.overlayKeys) this.input.keyboard!.off(ev);
    this.overlayKeys.length = 0;
    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }
    this.overlayType = undefined;
  }
}
