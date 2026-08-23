export type ShapeKind =
  // 원시 도형
  | 'circle'
  | 'ring'
  | 'rect'
  | 'diamond'
  | 'triangle'
  | 'star'
  // 코드로 그리는 캐릭터 (theme/critters.ts)
  | 'cat'
  | 'mouse'
  | 'cheese'
  | 'claw'
  | 'yarn';

export interface ShapeSpec {
  kind: ShapeKind;
  /** 화면에 표시될 한 변의 크기(px). 텍스처는 이보다 크게 굽고 줄여서 쓴다. */
  size: number;
  fill: number;
  stroke?: number;
  strokeWidth?: number;
  /** 귀 안쪽 (cat / mouse), 치즈 구멍색 (cheese) */
  accent?: number;
  /** 배·주둥이 패치. 없으면 accent 를 쓴다 */
  belly?: number;
  /** 줄무늬 (cat) */
  stripe?: number;
  /** 꼬리 색. 없으면 stroke(mouse) / fill(cat) */
  tail?: number;
  /** 들고 있는 아이템 색 — 고양이의 털실 */
  item?: number;
  /**
   * 텍스처 박스 중 "몸통" 이 차지하는 가로 비율 (0~1).
   *
   * 꼬리와 귀는 몸통 밖으로 뻗기 때문에, 적 스프라이트를 히트박스 지름에
   * 그대로 맞추면 정작 몸이 히트박스보다 훨씬 작아 보인다.
   * 이 값을 주면 "몸통 폭 = 히트박스 지름" 이 되도록 스프라이트를 키운다.
   * 생략하면 1 (박스 전체 = 히트박스).
   */
  bodyRatio?: number;
  /** 캐릭터가 치즈를 들고 있는지 (mouse) */
  holdsItem?: boolean;
  /** 0~1, 안쪽을 비우는 비율 (ring 전용) */
  hole?: number;
}

/**
 * 테마 = 이 게임의 "디자인 에셋 전체" 를 담는 하나의 객체.
 *
 * 프로토타입 단계에서는 도형을 코드로 그려 텍스처를 만들고,
 * 실제 아트가 준비되면 ShapeSpec 대신 이미지 경로만 꽂으면 된다.
 * (theme/textures.ts 의 buildTextures 참고)
 */
export interface Theme {
  id: string;
  label: string;

  bg: number;
  gridLine: number;
  hudAccent: number;

  player: ShapeSpec;
  enemies: Record<string, ShapeSpec>;
  projectiles: Record<string, ShapeSpec>;
  gem: ShapeSpec;
  gemBig: ShapeSpec;

  /**
   * 실제 스프라이트로 교체할 때 사용.
   * key -> public/assets 하위 경로. 지정된 key는 도형 생성 대신 이미지를 로드한다.
   */
  images?: Record<string, string>;
}
