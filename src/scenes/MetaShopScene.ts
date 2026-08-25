import Phaser from 'phaser';
import { VIEW } from '../config';
import { EXPEDITION_PREPS, LEGACY_TRAITS, META_UPGRADES, meta } from '../systems/MetaProgression';

const FONT = '"Pretendard", "Malgun Gothic", system-ui, sans-serif';
type Page = 'basic' | 'survival' | 'combat' | 'unlock' | 'prep' | 'legacy';

export class MetaShopScene extends Phaser.Scene {
  private page: Page = 'basic';
  constructor() { super('MetaShop'); }

  create() {
    this.scale.on('resize', this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.draw, this));
    this.draw();
  }

  private draw() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor('#0b0b16');
    const compact = VIEW.width < 520 || VIEW.height < 600;
    this.add.text(VIEW.width / 2, 16, '성장 상점', { fontFamily: FONT, fontSize: compact ? '26px' : '32px', color: '#ffffff' }).setOrigin(0.5, 0);
    const next = meta.nextLevelGold();
    this.add.text(VIEW.width / 2, 62, `메인 Lv ${meta.level}   ·   누적 골드 ${meta.totalGold}${next > meta.totalGold ? ` / 다음 Lv ${next}` : ''}`, {
      fontFamily: FONT, fontSize: '14px', color: '#9aa7ba',
    }).setOrigin(0.5, 0);
    this.add.text(VIEW.width - 12, 20, `보유 ${meta.gold} G`, { fontFamily: FONT, fontSize: compact ? '14px' : '18px', color: '#ffd36b' }).setOrigin(1, 0);

    const tabs: [Page, string][] = [['basic', '기본 강화'], ['survival', '생존 강화'], ['combat', '전투 강화'], ['unlock', '해금'], ['prep', '원정 준비'], ['legacy', '전승']];
    const tabW = Math.min(120, (VIEW.width - 24) / tabs.length);
    tabs.forEach(([id, label], i) => this.button(12 + tabW * (i + 0.5), 100, label, () => { this.page = id; this.draw(); }, this.page === id, compact ? 12 : 15));
    if (this.page === 'unlock') this.drawUnlocks();
    else if (this.page === 'prep') this.drawPrep();
    else if (this.page === 'legacy') this.drawLegacy();
    else this.drawUpgrades(this.page === 'basic' ? META_UPGRADES.slice(0, 3) : this.page === 'survival' ? META_UPGRADES.slice(3, 6) : META_UPGRADES.slice(6));
    this.button(VIEW.width / 2, VIEW.height - 30, '캐릭터 선택으로', () => this.scene.start('CharacterSelect'), false, compact ? 13 : 15);
  }

  private drawUpgrades(items: readonly typeof META_UPGRADES[number][]) {
    const width = Math.min(620, VIEW.width - 32);
    const x = (VIEW.width - width) / 2;
    const gap = 10;
    const h = Math.min(118, Math.max(62, (VIEW.height - 200 - gap * (items.length - 1)) / items.length));
    items.forEach((item, i) => {
      const y = 144 + i * (h + gap);
      const dense = h < 90;
      const unlocked = meta.level >= item.unlock;
      const level = meta.levelOf(item.id);
      const cost = meta.upgradeCost(item.id);
      const canBuy = unlocked && level < 5 && meta.gold >= cost;
      const g = this.add.graphics().fillStyle(unlocked ? 0x121824 : 0x10131b, 1).fillRoundedRect(x, y, width, h, 10)
        .lineStyle(2, unlocked ? 0x2b3547 : 0x252a35, 1).strokeRoundedRect(x, y, width, h, 10);
      this.add.text(x + 14, y + (dense ? 10 : 16), item.name, { fontFamily: FONT, fontSize: dense ? '15px' : '20px', color: unlocked ? '#ffffff' : '#657085' });
      this.add.text(x + 14, y + (dense ? 34 : 48), `${item.desc} · Lv ${level}/5`, { fontFamily: FONT, fontSize: dense ? '11px' : '14px', color: '#aeb9ca' });
      const label = !unlocked ? `메인 Lv ${item.unlock} 필요` : level >= 5 ? '최대 강화' : `${cost} G 구매`;
      const buy = this.add.text(x + width - 12, y + h / 2, label, { fontFamily: FONT, fontSize: dense ? '11px' : '15px', color: canBuy ? '#0b1520' : '#8e9aae', backgroundColor: canBuy ? '#8dceff' : '#232b3a', padding: { x: dense ? 6 : 10, y: dense ? 5 : 8 } }).setOrigin(1, 0.5);
      if (canBuy) buy.setInteractive({ useHandCursor: true }).on('pointerup', () => { meta.buyUpgrade(item.id); this.draw(); });
      g.setDepth(-1);
    });
  }

  private drawUnlocks() {
    const ids = ['rate15', 'dog', 'rate2', 'rate3'] as const;
    const width = Math.min(620, VIEW.width - 32);
    const x = (VIEW.width - width) / 2;
    const h = Math.min(90, (VIEW.height - 200) / 4);
    ids.forEach((id, i) => {
      const item = meta.unlockInfo(id);
      const y = 152 + i * (h + 10);
      const owned = meta.isUnlocked(id);
      const available = meta.level >= item.level && meta.gold >= item.cost;
      this.add.graphics().fillStyle(owned ? 0x16251f : 0x121824, 1).fillRoundedRect(x, y, width, h, 10).lineStyle(2, owned ? 0x4fbf83 : 0x2b3547, 1).strokeRoundedRect(x, y, width, h, 10);
      this.add.text(x + 18, y + 14, item.name, { fontFamily: FONT, fontSize: '19px', color: '#ffffff' });
      this.add.text(x + 18, y + 44, item.desc, { fontFamily: FONT, fontSize: '13px', color: '#aeb9ca' });
      const label = owned ? '해금 완료' : meta.level < item.level ? `메인 Lv ${item.level} 필요` : `${item.cost} G 구매`;
      const buy = this.add.text(x + width - 18, y + h / 2, label, { fontFamily: FONT, fontSize: '15px', color: available && !owned ? '#0b1520' : '#8e9aae', backgroundColor: available && !owned ? '#8dceff' : '#232b3a', padding: { x: 10, y: 8 } }).setOrigin(1, 0.5);
      if (available && !owned) buy.setInteractive({ useHandCursor: true }).on('pointerup', () => { meta.buyUnlock(id); this.draw(); });
    });
  }

  private drawPrep() {
    const width = Math.min(620, VIEW.width - 32);
    const x = (VIEW.width - width) / 2;
    const compact = VIEW.height < 680;
    this.add.text(VIEW.width / 2, 138, '골드로 올리는 영구 원정 준비 · 매 런 자동 적용', { fontFamily: FONT, fontSize: compact ? '13px' : '16px', color: '#ffd36b' }).setOrigin(0.5);
    const h = Math.min(94, Math.max(68, (VIEW.height - 220) / 4));
    EXPEDITION_PREPS.forEach((prep, i) => {
      const y = 158 + i * (h + 9);
      const level = meta.prepLevel(prep.id);
      const cost = meta.prepCost(prep.id);
      const canBuy = level < 5 && meta.gold >= cost;
      this.add.graphics().fillStyle(level >= 5 ? 0x1a2430 : 0x121824, 1).fillRoundedRect(x, y, width, h, 10).lineStyle(2, level >= 5 ? 0x4fbf83 : 0x2b3547, 1).strokeRoundedRect(x, y, width, h, 10);
      this.add.text(x + 16, y + (compact ? 12 : 16), prep.name, { fontFamily: FONT, fontSize: compact ? '16px' : '20px', color: '#ffffff' });
      this.add.text(x + 16, y + (compact ? 38 : 48), `${prep.desc} · Lv ${level}/5`, { fontFamily: FONT, fontSize: compact ? '11px' : '14px', color: '#aeb9ca' });
      const label = level >= 5 ? '최대 강화' : `${cost.toLocaleString()} G`;
      const buy = this.add.text(x + width - 14, y + h / 2, label, { fontFamily: FONT, fontSize: compact ? '11px' : '15px', color: canBuy ? '#0b1520' : '#8e9aae', backgroundColor: canBuy ? '#8dceff' : '#232b3a', padding: { x: compact ? 6 : 10, y: compact ? 5 : 8 } }).setOrigin(1, 0.5);
      if (canBuy) buy.setInteractive({ useHandCursor: true }).on('pointerup', () => { meta.buyPrep(prep.id); this.draw(); });
    });
  }

  private drawLegacy() {
    const compact = VIEW.height < 680;
    const width = Math.min(620, VIEW.width - 32);
    const x = (VIEW.width - width) / 2;
    if (!meta.legacyUnlocked) {
      this.add.text(VIEW.width / 2, 210, '메인 Lv 20에서 달빛 전승이 열립니다', { fontFamily: FONT, fontSize: compact ? '18px' : '24px', color: '#d8c5ff' }).setOrigin(0.5);
      this.add.text(VIEW.width / 2, 250, '완주·처치·생존으로 골드를 모아 메인 레벨을 올리세요.', { fontFamily: FONT, fontSize: '14px', color: '#8f9bb0' }).setOrigin(0.5);
      return;
    }
    const next = meta.nextPrestigeXp();
    const done = meta.challenges().filter((challenge) => challenge.complete);
    this.add.text(VIEW.width / 2, 138, `달빛 명성 Lv ${meta.prestigeLevel} · 전승 인장 ${meta.moonSeals}개 · 도전 ${done.length}/5${next > meta.prestigeXp ? ` · 다음 ${next}` : ''}`, { fontFamily: FONT, fontSize: compact ? '13px' : '15px', color: '#d8c5ff' }).setOrigin(0.5);
    this.add.graphics().fillStyle(0x201a31, 1).fillRoundedRect(x, 156, width, 46, 9).lineStyle(1, 0x6f55a5, 1).strokeRoundedRect(x, 156, width, 46, 9);
    this.add.text(x + 12, 166, '전승 인장', { fontFamily: FONT, fontSize: compact ? '14px' : '17px', color: '#f0e7ff' });
    this.add.text(x + 12, 184, '명성 레벨업과 도전 과제 보상으로 획득합니다.', { fontFamily: FONT, fontSize: compact ? '10px' : '12px', color: '#c0b4d7' });
    this.add.text(x + width - 12, 179, '공물 판매 중단', { fontFamily: FONT, fontSize: compact ? '11px' : '14px', color: '#c8bbdc', backgroundColor: '#302643', padding: { x: compact ? 6 : 9, y: compact ? 5 : 7 } }).setOrigin(1, 0.5);
    const h = compact ? 66 : 82;
    LEGACY_TRAITS.forEach((trait, i) => {
      const y = 214 + i * (h + 6);
      const owned = meta.traitOwned(trait.id);
      const mastery = meta.masteryLevel(trait.character);
      const available = !owned && mastery >= trait.mastery && meta.moonSeals > 0 && meta.gold >= trait.gold;
      this.add.graphics().fillStyle(owned ? 0x1c2736 : 0x121824, 1).fillRoundedRect(x, y, width, h, 10).lineStyle(2, owned ? 0x8a6cff : 0x2b3547, 1).strokeRoundedRect(x, y, width, h, 10);
      const icon = this.add.image(x + 42, y + h / 2, 'asset:legacy:sheet', trait.frame); icon.setDisplaySize(compact ? 46 : 58, compact ? 46 : 58);
      this.add.text(x + 80, y + (compact ? 14 : 18), `${trait.name} · ${trait.character === 'cat' ? '고양이' : '강아지'}`, { fontFamily: FONT, fontSize: compact ? '15px' : '18px', color: '#ffffff' });
      this.add.text(x + 80, y + (compact ? 40 : 50), `${trait.desc} · 숙련 Lv ${trait.mastery} · ${trait.gold.toLocaleString()}G`, { fontFamily: FONT, fontSize: compact ? '10px' : '13px', color: '#aeb9ca' });
      const label = owned ? '보유' : mastery < trait.mastery ? `숙련 Lv ${trait.mastery}` : meta.moonSeals < 1 ? '인장 부족' : meta.gold < trait.gold ? '골드 부족' : '인장 1개';
      const buy = this.add.text(x + width - 14, y + h / 2, label, { fontFamily: FONT, fontSize: compact ? '11px' : '14px', color: available ? '#120c20' : '#8e9aae', backgroundColor: available ? '#c6a4ff' : '#232b3a', padding: { x: compact ? 6 : 9, y: compact ? 5 : 7 } }).setOrigin(1, 0.5);
      if (available) buy.setInteractive({ useHandCursor: true }).on('pointerup', () => { meta.buyTrait(trait.id); this.draw(); });
    });
    const challengeText = meta.challenges().map((challenge) => `${challenge.complete ? '✓' : '○'} ${challenge.name}`).join('   ');
    if (!compact) this.add.text(VIEW.width / 2, 570, `도전 과제 ${done.length}/5 · ${challengeText}`, { fontFamily: FONT, fontSize: '13px', color: '#ffd36b', align: 'center', wordWrap: { width: VIEW.width - 30 } }).setOrigin(0.5);
  }

  private button(x: number, y: number, label: string, action: () => void, active = false, size = 15) {
    const text = this.add.text(x, y, label, { fontFamily: FONT, fontSize: `${size}px`, color: active ? '#0b1520' : '#c9d3e0', backgroundColor: active ? '#8dceff' : '#232b3a', padding: { x: size < 15 ? 7 : 12, y: size < 15 ? 6 : 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on('pointerup', action);
  }
}
