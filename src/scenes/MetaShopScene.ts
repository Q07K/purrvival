import Phaser from 'phaser';
import { VIEW } from '../config';
import { META_UPGRADES, meta } from '../systems/MetaProgression';

const FONT = '"Pretendard", "Malgun Gothic", system-ui, sans-serif';
type Page = 'basic' | 'survival' | 'combat' | 'unlock';

export class MetaShopScene extends Phaser.Scene {
  private page: Page = 'basic';
  constructor() { super('MetaShop'); }

  create() { this.draw(); }

  private draw() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor('#0b0b16');
    this.add.text(VIEW.width / 2, 20, '성장 상점', { fontFamily: FONT, fontSize: '32px', color: '#ffffff' }).setOrigin(0.5, 0);
    const next = meta.nextLevelGold();
    this.add.text(VIEW.width / 2, 62, `메인 Lv ${meta.level}   ·   누적 골드 ${meta.totalGold}${next > meta.totalGold ? ` / 다음 Lv ${next}` : ''}`, {
      fontFamily: FONT, fontSize: '14px', color: '#9aa7ba',
    }).setOrigin(0.5, 0);
    this.add.text(VIEW.width - 18, 24, `보유 ${meta.gold} G`, { fontFamily: FONT, fontSize: '18px', color: '#ffd36b' }).setOrigin(1, 0);

    const tabs: [Page, string][] = [['basic', '기본 강화'], ['survival', '생존 강화'], ['combat', '전투 강화'], ['unlock', '해금']];
    tabs.forEach(([id, label], i) => this.button(VIEW.width / 2 - 180 + i * 120, 100, label, () => { this.page = id; this.draw(); }, this.page === id));
    if (this.page === 'unlock') this.drawUnlocks();
    else this.drawUpgrades(this.page === 'basic' ? META_UPGRADES.slice(0, 3) : this.page === 'survival' ? META_UPGRADES.slice(3, 6) : META_UPGRADES.slice(6));
    this.button(VIEW.width / 2, VIEW.height - 42, '캐릭터 선택으로', () => this.scene.start('CharacterSelect'));
  }

  private drawUpgrades(items: readonly typeof META_UPGRADES[number][]) {
    const width = Math.min(620, VIEW.width - 32);
    const x = (VIEW.width - width) / 2;
    const h = Math.min(118, (VIEW.height - 190) / items.length);
    items.forEach((item, i) => {
      const y = 152 + i * (h + 10);
      const unlocked = meta.level >= item.unlock;
      const level = meta.levelOf(item.id);
      const cost = meta.upgradeCost(item.id);
      const canBuy = unlocked && level < 5 && meta.gold >= cost;
      const g = this.add.graphics().fillStyle(unlocked ? 0x121824 : 0x10131b, 1).fillRoundedRect(x, y, width, h, 10)
        .lineStyle(2, unlocked ? 0x2b3547 : 0x252a35, 1).strokeRoundedRect(x, y, width, h, 10);
      this.add.text(x + 18, y + 16, item.name, { fontFamily: FONT, fontSize: '20px', color: unlocked ? '#ffffff' : '#657085' });
      this.add.text(x + 18, y + 48, `${item.desc}   ·   Lv ${level}/5`, { fontFamily: FONT, fontSize: '14px', color: '#aeb9ca' });
      const label = !unlocked ? `메인 Lv ${item.unlock} 필요` : level >= 5 ? '최대 강화' : `${cost} G 구매`;
      const buy = this.add.text(x + width - 18, y + h / 2, label, { fontFamily: FONT, fontSize: '15px', color: canBuy ? '#0b1520' : '#8e9aae', backgroundColor: canBuy ? '#8dceff' : '#232b3a', padding: { x: 10, y: 8 } }).setOrigin(1, 0.5);
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

  private button(x: number, y: number, label: string, action: () => void, active = false) {
    const text = this.add.text(x, y, label, { fontFamily: FONT, fontSize: '15px', color: active ? '#0b1520' : '#c9d3e0', backgroundColor: active ? '#8dceff' : '#232b3a', padding: { x: 12, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on('pointerup', action);
  }
}
