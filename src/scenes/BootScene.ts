import Phaser from 'phaser';

/** 고양이 테마용 비트맵 스프라이트만 먼저 로드한 뒤 게임을 시작한다. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.spritesheet('asset:cat:sheet', 'assets/sprites/cat-walk-sheet-v4.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('asset:dog:sheet', 'assets/sprites/dog-walk-sheet-v3.png', { frameWidth: 627, frameHeight: 627 });
    this.load.spritesheet('asset:mouse:sheet', 'assets/sprites/mouse-walk-sheet-v4.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('asset:skill:sheet', 'assets/sprites/skill-icons-sheet-v1.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('asset:collab:sheet', 'assets/sprites/collab-weapons-sheet-v1.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('asset:gem:sheet', 'assets/sprites/gem-rewards-sheet-v1.png', { frameWidth: 627, frameHeight: 627 });
    this.load.spritesheet('asset:event:sheet', 'assets/sprites/map-events-sheet-v1.png', { frameWidth: 627, frameHeight: 627 });
    this.load.spritesheet('asset:rare:sheet', 'assets/sprites/rare-choice-sheet-v1.png', { frameWidth: 627, frameHeight: 627 });
    this.load.spritesheet('asset:legacy:sheet', 'assets/sprites/legacy-traits-sheet-v1.png', { frameWidth: 627, frameHeight: 627 });
    this.load.spritesheet('asset:burrow:sheet', 'assets/sprites/burrow-raider-mouse-sheet-v1.png', { frameWidth: 768, frameHeight: 512 });
    this.load.spritesheet('asset:slinger:sheet', 'assets/sprites/cheese-slinger-mouse-sheet-v1.png', { frameWidth: 543, frameHeight: 724 });
    this.load.spritesheet('asset:boss:sheet', 'assets/sprites/moon-burrow-king-sheet-v1.png', { frameWidth: 627, frameHeight: 627 });
    this.load.image('asset:bg:attic', 'assets/backgrounds/attic-moonlight-v1.png');
    this.load.image('asset:bg:cellar', 'assets/backgrounds/cheese-cellar-v1.png');
    this.load.image('asset:bg:garden', 'assets/backgrounds/moon-garden-v1.png');
    this.load.image('asset:bg:rooftop', 'assets/backgrounds/rainy-rooftop-v1.png');
    this.load.image('asset:bg:toyroom', 'assets/backgrounds/toy-room-v1.png');
  }

  create() {
    this.scene.start('CharacterSelect');
  }
}
