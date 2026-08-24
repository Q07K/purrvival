import Phaser from 'phaser';

/**
 * GameScene <-> UIScene 통신용 이벤트 버스.
 * 씬을 pause 해도 이벤트 핸들러는 계속 동작하므로
 * "레벨업 중 게임 정지" 같은 흐름을 만들기 좋다.
 */
export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  /** HUD 갱신 */
  stats: 'stats',
  /** 레벨업 → 선택지 3장 제시 */
  levelup: 'levelup',
  /** 15분 털실 제단의 희귀 보상 선택 */
  rareChoice: 'rareChoice',
  /** 5분 맵 이벤트 안내 */
  mapEvent: 'mapEvent',
  /** 오버타임 변이 선택 */
  mutationChoice: 'mutationChoice',
  /** UI에서 카드 선택 완료 */
  picked: 'picked',
  rarePicked: 'rarePicked',
  mutationPicked: 'mutationPicked',
  /** ESC 일시정지 */
  pause: 'pause',
  /** UI 버튼의 일시정지 요청 */
  pauseRequest: 'pauseRequest',
  /** 20분 완주 뒤 무한 오버타임 진입 */
  overtime: 'overtime',
  /** 일시정지 해제 */
  resume: 'resume',
  /** 게임 배속 변경 */
  speed: 'speed',
  /** 사망 */
  gameover: 'gameover',
  /** 재시작 요청 */
  restart: 'restart',
  /** 시작 화면으로 이동 */
  menu: 'menu',
  /** 현재 런을 포기하고 지금까지의 보상을 정산 */
  quit: 'quit',
  /** 테마 전환 */
  themeChanged: 'themeChanged',
  /** 브라우저/기기 화면 크기 변경 */
  resize: 'resize',
} as const;
