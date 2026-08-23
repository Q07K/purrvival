import Phaser from 'phaser';
import { CHARACTERS, selectCharacter } from '../data/characters';
import { VIEW } from '../config';
import { meta } from '../systems/MetaProgression';

const FONT = '"Pretendard", "Malgun Gothic", system-ui, sans-serif';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0b16');
    this.add.text(VIEW.width / 2, 64, '캐릭터 선택', {
      fontFamily: FONT, fontSize: '38px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(VIEW.width / 2, 108, '시작 무기가 서로 달라요', {
      fontFamily: FONT, fontSize: '16px', color: '#93a2b8',
    }).setOrigin(0.5);
    this.add.text(VIEW.width - 16, 18, `골드 ${meta.gold} · 메인 Lv ${meta.level}`, {
      fontFamily: FONT, fontSize: '15px', color: '#ffd36b',
    }).setOrigin(1, 0);
    const shop = this.add.text(16, 18, '성장 상점', {
      fontFamily: FONT, fontSize: '16px', color: '#8dceff', backgroundColor: '#1b2434', padding: { x: 10, y: 6 },
    }).setInteractive({ useHandCursor: true });
    shop.on('pointerup', () => this.scene.start('MetaShop'));

    const stacked = VIEW.width < 680;
    const cardW = Math.min(280, VIEW.width - 40);
    const cardH = 268;
    const gap = 28;
    const startX = stacked ? VIEW.width / 2 : VIEW.width / 2 - (cardW + gap) / 2;
    const startY = stacked ? 152 : VIEW.height / 2 - cardH / 2 + 36;

    CHARACTERS.forEach((character, index) => {
      const x = stacked ? startX : startX + index * (cardW + gap);
      const y = stacked ? startY + index * (cardH + 18) : startY;
      this.makeCard(character, index, x, y, cardW, cardH, character.id === 'dog' && !meta.isUnlocked('dog'));
    });

    this.input.keyboard!.once('keydown-ONE', () => this.choose('cat'));
    this.input.keyboard!.once('keydown-TWO', () => this.choose('dog'));
  }

  private makeCard(
    character: (typeof CHARACTERS)[number], index: number, x: number, y: number, width: number, height: number, locked: boolean,
  ) {
    const bg = this.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x1b2434 : 0x121824, 1).fillRoundedRect(x - width / 2, y, width, height, 14);
      bg.lineStyle(2, hover ? 0xff9eb4 : 0x2b3547, 1).strokeRoundedRect(x - width / 2, y, width, height, 14);
    };
    draw(false);

    this.add.text(x - width / 2 + 16, y + 14, `${index + 1}`, {
      fontFamily: FONT, fontSize: '15px', color: '#68778d',
    });
    this.add.image(x, y + 105, character.sheet, 0).setDisplaySize(138, 138);
    this.add.text(x, y + 180, character.name, {
      fontFamily: FONT, fontSize: '25px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(x, y + 215, `시작 무기 · ${character.weaponName}`, {
      fontFamily: FONT, fontSize: '15px', color: '#ffb5c7',
    }).setOrigin(0.5);
    this.add.text(x, y + 242, locked ? '메인 Lv 5 · 2,500 골드' : '선택해서 시작', {
      fontFamily: FONT, fontSize: '13px', color: '#91a0b5',
    }).setOrigin(0.5);

    const zone = this.add.zone(x - width / 2, y, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => locked ? this.scene.start('MetaShop') : this.choose(character.id));
  }

  private choose(id: (typeof CHARACTERS)[number]['id']) {
    if (id === 'dog' && !meta.isUnlocked('dog')) return;
    selectCharacter(id);
    this.scene.start('Game');
  }
}
