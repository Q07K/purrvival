import type { Poolable } from '../types';

/**
 * 고정 인덱스 오브젝트 풀.
 *
 * 스폰/디스폰이 초당 수백 번 일어나므로 객체를 새로 만들면
 * GC 가 주기적으로 프레임을 잡아먹는다. 미리 만들어두고 재사용한다.
 *
 * items 배열의 인덱스는 절대 바뀌지 않는다 —
 * SpatialHash 가 그 인덱스를 그대로 저장하기 때문.
 */
export class Pool<T extends Poolable> {
  readonly items: T[] = [];
  private free: number[] = [];
  private liveCount = 0;

  constructor(
    private readonly capacity: number,
    private readonly factory: (index: number) => T,
    private readonly onReset: (item: T) => void,
  ) {}

  get live(): number {
    return this.liveCount;
  }

  /** 여유가 없으면 null. 호출부에서 스폰을 건너뛰면 된다. */
  spawn(): T | null {
    let idx: number;
    if (this.free.length > 0) {
      idx = this.free.pop()!;
    } else if (this.items.length < this.capacity) {
      const item = this.factory(this.items.length);
      this.items.push(item);
      idx = item.index;
    } else {
      return null;
    }

    const item = this.items[idx];
    item.active = true;
    this.liveCount++;
    return item;
  }

  release(item: T): void {
    if (!item.active) return;
    item.active = false;
    this.onReset(item);
    this.free.push(item.index);
    this.liveCount--;
  }

  releaseAll(): void {
    for (const item of this.items) {
      if (item.active) this.release(item);
    }
  }
}
