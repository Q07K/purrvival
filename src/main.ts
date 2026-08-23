import Phaser from 'phaser';
import { setViewSize, VIEW } from './config';
import { EV, bus } from './bus';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { MetaShopScene } from './scenes/MetaShopScene';

setViewSize(window.innerWidth, window.innerHeight);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#0b0b16',
  roundPixels: true,
  antialias: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  // 물리 엔진을 쓰지 않는다.
  // Arcade Physics 로 적 1000마리를 돌리면 브로드페이즈가 병목이 되는데,
  // 이 장르는 "원 vs 원" 판정만 필요하므로 직접 짠 공간 해시가 훨씬 빠르다.
  scene: [BootScene, CharacterSelectScene, MetaShopScene, GameScene, UIScene],
});

game.scale.on(Phaser.Scale.Events.RESIZE, (size: Phaser.Structs.Size) => {
  setViewSize(size.width, size.height);
  bus.emit(EV.resize);
});

// 개발 편의: 콘솔에서 씬/풀 상태를 들여다볼 수 있게 노출한다.
if (import.meta.env.DEV) {
  Object.assign(window, { game, bus, EV });
}
