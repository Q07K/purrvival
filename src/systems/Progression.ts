import { MAX_PASSIVE_SLOTS, MAX_WEAPON_SLOTS, PLAYER } from '../config';
import { PASSIVE_BY_ID, PASSIVES } from '../data/passives';
import { COLLAB_BY_ID, COLLABS, STARTING_WEAPON, WEAPON_BY_ID, WEAPONS } from '../data/weapons';
import { selectedCharacter } from '../data/characters';
import { meta } from './MetaProgression';
import type { Choice, Loadout, OwnedWeapon, PlayerState, WeaponStats } from '../types';

/**
 * 무기 보유 상태 + 패시브 레벨 + 그로부터 파생되는 최종 스탯을 관리한다.
 * 전투 로직(GameScene)과 성장 로직을 분리해두면 밸런싱이 훨씬 편하다.
 */
export class Progression {
  weapons: OwnedWeapon[] = [];
  passives = new Map<string, number>();

  reset() {
    this.weapons = [];
    this.passives.clear();
    this.addWeapon(selectedCharacter.weapon ?? STARTING_WEAPON);
  }

  addWeapon(id: string) {
    const def = WEAPON_BY_ID.get(id);
    if (!def || this.weapons.length >= MAX_WEAPON_SLOTS) return;
    this.weapons.push({ def, level: 1, slot: this.weapons.length, nextAt: 0, phase: 0, stacks: 1 });
  }

  /** 일시정지 화면용 현재 빌드 요약 */
  loadout(): Loadout {
    return {
      weapons: this.weapons.map((w) => ({
        name: w.stacks > 1 ? `${w.def.name} ×${w.stacks}` : w.def.name,
        level: w.level,
        maxLevel: w.def.maxLevel,
        stacks: w.stacks,
        isCollab: COLLAB_BY_ID.has(w.def.id),
        tex: w.def.tex,
      })),
      passives: [...this.passives.entries()].map(([id, level]) => ({
        name: PASSIVE_BY_ID.get(id)?.name ?? id,
        level,
      })),
    };
  }

  /** 패시브를 반영한 무기 최종 스탯 */
  statsFor(w: OwnedWeapon, p: PlayerState): WeaponStats {
    const s = w.def.stats(w.level);
    const stackMult = 1 + (w.stacks - 1) * 0.75;
    const projectile = w.def.behavior === 'projectile' || w.def.behavior === 'spread' || w.def.behavior === 'rain';
    return {
      ...s,
      damage: s.damage * p.damageMult * stackMult,
      cooldown: s.cooldown * p.cooldownMult * (w.def.behavior === 'aura' ? p.auraCooldownMult : 1),
      area: s.area * p.areaMult,
      life: s.life * p.areaMult * p.projectileLifeMult,
      speed: projectile ? s.speed * p.projectileSpeedMult : w.def.behavior === 'orbit' ? s.speed * p.orbitSpeedMult : s.speed,
      stacks: w.stacks,
    };
  }

  /** 패시브 레벨 -> 플레이어 파생 스탯. 레벨업 때마다 다시 계산한다. */
  applyPassives(p: PlayerState) {
    const lv = (id: string) => this.passives.get(id) ?? 0;

    const prevMax = p.maxHp;
    p.maxHp = PLAYER.maxHp + 25 * lv('vitality');
    if (p.maxHp > prevMax) p.hp += p.maxHp - prevMax;
    p.hp = Math.min(p.hp, p.maxHp);

    p.speed = PLAYER.baseSpeed * (1 + 0.1 * lv('boots'));
    p.damageMult = 1 + 0.12 * lv('might');
    p.cooldownMult = Math.pow(0.92, lv('haste'));
    p.areaMult = 1 + 0.1 * lv('area');
    p.magnet = PLAYER.magnet * (1 + 0.25 * lv('magnet'));
    p.xpMult = 1;
    p.projectileSpeedMult = 1;
    p.projectileLifeMult = 1;
    p.auraCooldownMult = 1;
    p.orbitSpeedMult = 1 + lv('haste') * 0.08;
    p.armor = 2 * lv('armor');
    meta.apply(p);
  }

  /* ---------------------------------------------------------------- */
  /* 레벨업 선택지 생성                                                 */
  /* ---------------------------------------------------------------- */

  private candidates(): Choice[] {
    const out: Choice[] = [];

    // 1) 보유 무기 강화
    for (const w of this.weapons) {
      if (w.level >= w.def.maxLevel) continue;
      out.push({
        kind: 'weapon-up',
        id: w.def.id,
        name: w.def.name,
        detail: w.def.note(w.level + 1),
        level: w.level + 1,
        maxLevel: w.def.maxLevel,
        tex: w.def.tex,
      });
    }

    // 두 재료 무기가 모두 최종 레벨이면 콜라보 진화가 선택지에 추가된다.
    for (const def of COLLABS) {
      const parts = def.ingredients.map((id) => this.weapons.find((w) => w.def.id === id));
      const evolved = this.weapons.find((w) => w.def.id === def.id);
      if (parts.every((w) => w && w.level >= w.def.maxLevel) && (!evolved || evolved.stacks < 5)) {
        out.push({
          kind: 'collab', id: def.id, name: def.name,
          detail: evolved ? `재조합 · 중첩 ${evolved.stacks + 1}/5` : `${parts[0]!.def.name} + ${parts[1]!.def.name} 진화`,
          level: evolved ? evolved.stacks + 1 : 1, maxLevel: evolved ? 5 : 1, tex: def.tex,
        });
      }
    }

    // 2) 새 무기 (슬롯이 남을 때만)
    if (this.weapons.length < MAX_WEAPON_SLOTS) {
      const owned = new Set(this.weapons.map((w) => w.def.id));
      for (const def of WEAPONS) {
        if (owned.has(def.id)) continue;
        out.push({
          kind: 'weapon-new',
          id: def.id,
          name: def.name,
          detail: def.desc,
          level: 1,
          maxLevel: def.maxLevel,
          tex: def.tex,
        });
      }
    }

    // 3) 패시브
    for (const def of PASSIVES) {
      const cur = this.passives.get(def.id) ?? 0;
      if (cur >= def.maxLevel) continue;
      if (cur === 0 && this.passives.size >= MAX_PASSIVE_SLOTS) continue;
      out.push({
        kind: 'passive',
        id: def.id,
        name: def.name,
        detail: cur === 0 ? def.desc : def.note(cur + 1),
        level: cur + 1,
        maxLevel: def.maxLevel,
        tex: def.tex,
      });
    }

    return out;
  }

  /** 중복 없이 최대 3장 */
  rollChoices(rng: () => number, n = 3): Choice[] {
    const pool = this.candidates();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
  }

  apply(choice: Choice, p: PlayerState) {
    switch (choice.kind) {
      case 'weapon-new':
        this.addWeapon(choice.id);
        break;
      case 'weapon-up': {
        const w = this.weapons.find((x) => x.def.id === choice.id);
        if (w && w.level < w.def.maxLevel) w.level++;
        break;
      }
      case 'passive': {
        const def = PASSIVE_BY_ID.get(choice.id);
        if (!def) break;
        const cur = this.passives.get(choice.id) ?? 0;
        if (cur < def.maxLevel) this.passives.set(choice.id, cur + 1);
        break;
      }
      case 'collab': {
        const def = COLLAB_BY_ID.get(choice.id);
        if (!def) break;
        const parts = new Set(def.ingredients);
        const owned = this.weapons.filter((w) => parts.has(w.def.id) && w.level >= w.def.maxLevel);
        if (owned.length !== 2) break;
        this.weapons = this.weapons.filter((w) => !parts.has(w.def.id));
        const evolved = this.weapons.find((w) => w.def.id === def.id);
        if (evolved) evolved.stacks = Math.min(5, evolved.stacks + 1);
        else this.weapons.push({ def, level: 1, slot: 0, nextAt: 0, phase: 0, stacks: 1 });
        this.weapons.forEach((w, index) => { w.slot = index; });
        break;
      }
    }
    this.applyPassives(p);
  }
}
