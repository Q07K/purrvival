/**
 * 균일 격자 공간 해시.
 *
 * 이 장르의 성능은 전적으로 여기서 갈린다.
 * 적 1000마리 x 투사체 200개를 순진하게 비교하면 프레임당 20만 번인데,
 * 격자로 나누면 각 질의가 주변 몇 칸만 훑으므로 실질 O(n).
 *
 * 매 프레임 clear() -> insert() 로 다시 채우고 query 한다.
 * clear 는 Map 의 키를 지우지 않고 배열 길이만 0으로 만들어
 * 할당/GC 를 피한다.
 */
export class SpatialHash {
  private cells = new Map<number, number[]>();
  private readonly inv: number;

  constructor(private readonly cellSize: number) {
    this.inv = 1 / cellSize;
  }

  /** 셀 좌표 -> 정수 키. |좌표| < 32768 셀 범위에서 충돌 없음. */
  private key(cx: number, cy: number): number {
    return (cx + 0x8000) * 0x10000 + (cy + 0x8000);
  }

  clear(): void {
    for (const arr of this.cells.values()) arr.length = 0;
  }

  insert(x: number, y: number, id: number): void {
    const k = this.key(Math.floor(x * this.inv), Math.floor(y * this.inv));
    const arr = this.cells.get(k);
    if (arr === undefined) this.cells.set(k, [id]);
    else arr.push(id);
  }

  /**
   * (x, y) 반경 r 안에 있을 "가능성이 있는" id 들을 out 에 채운다.
   * 격자 단위라 실제 거리 검사는 호출자가 해야 한다.
   * out 은 재사용 버퍼 — 매 프레임 새 배열을 만들지 않기 위함.
   */
  query(x: number, y: number, r: number, out: number[]): number[] {
    out.length = 0;
    const minX = Math.floor((x - r) * this.inv);
    const maxX = Math.floor((x + r) * this.inv);
    const minY = Math.floor((y - r) * this.inv);
    const maxY = Math.floor((y + r) * this.inv);

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (arr === undefined) continue;
        for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }

  /** 셀 크기를 넘는 질의를 반복하지 않도록 하는 디버그용 지표 */
  get cellCount(): number {
    return this.cells.size;
  }

  get suggestedMaxQueryRadius(): number {
    return this.cellSize * 8;
  }
}
