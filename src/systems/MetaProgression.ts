import type { PlayerState } from '../types';

export const META_UPGRADES = [
  { id: 'hp', name: '튼튼한 발바닥', desc: '최대 HP +5%', base: 150, unlock: 1 },
  { id: 'speed', name: '빠른 발걸음', desc: '이동 속도 +3%', base: 150, unlock: 1 },
  { id: 'damage', name: '날카로운 발톱', desc: '모든 피해 +4%', base: 180, unlock: 1 },
  { id: 'magnet', name: '넓은 수염', desc: '획득 범위 +12%', base: 180, unlock: 2 },
  { id: 'healDrop', name: '행운의 방울', desc: '회복 하트 확률 +0.7%', base: 220, unlock: 2 },
  { id: 'healPower', name: '따뜻한 간식', desc: '회복량 +12%', base: 220, unlock: 3 },
  { id: 'xp', name: '성장의 수염', desc: '젬 경험치 +8%', base: 200, unlock: 3 },
  { id: 'projectile', name: '재빠른 발톱', desc: '투사체 속도·수명 +8%', base: 300, unlock: 6 },
  { id: 'auraSpeed', name: '파동의 숨결', desc: '장판 공격 속도 +8%', base: 300, unlock: 6 },
  { id: 'orbitSpeed', name: '빙글 꼬리', desc: '궤도 회전 속도 +8%', base: 320, unlock: 7 },
  { id: 'area', name: '긴 수염', desc: '무기 범위 +6%', base: 320, unlock: 7 },
  { id: 'attackSpeed', name: '민첩한 앞발', desc: '모든 무기 공격 주기 -4%', base: 350, unlock: 8 },
  { id: 'rarePower', name: '희귀한 실', desc: '희귀 제단 축복 효과 +8%', base: 420, unlock: 10 },
] as const;

export type MetaUpgradeId = (typeof META_UPGRADES)[number]['id'];
type UnlockId = 'dog' | 'rate15' | 'rate2' | 'rate3';
export type RunRecord = { time: number; kills: number; level: number; cleared: boolean; score: number; mutations: number };

const RANK_GOLD = [0, 800, 2400, 5000, 8500, 13000, 19000, 27000, 37000, 50000, 66000, 85000, 108000, 136000, 170000, 210000, 260000, 320000, 390000, 470000];
const UNLOCKS: Record<UnlockId, { name: string; desc: string; cost: number; level: number }> = {
  rate15: { name: '1.5× 배속', desc: '전투 배속 1.5× 해금', cost: 1200, level: 3 },
  dog: { name: '강아지', desc: '펄스로 시작하는 강아지 해금', cost: 2500, level: 5 },
  rate2: { name: '2× 배속', desc: '전투 배속 2× 해금', cost: 4000, level: 7 },
  rate3: { name: '3× 배속', desc: '전투 배속 3× 해금', cost: 10000, level: 12 },
};

type SaveData = { gold: number; totalGold: number; upgrades: Record<MetaUpgradeId, number>; unlocks: Record<UnlockId, boolean>; records: RunRecord[] };
const KEY = 'cat-survivors-meta-v1';
const fresh = (): SaveData => ({
  gold: 0, totalGold: 0,
  upgrades: { hp: 0, speed: 0, damage: 0, magnet: 0, healDrop: 0, healPower: 0, xp: 0, projectile: 0, auraSpeed: 0, orbitSpeed: 0, area: 0, attackSpeed: 0, rarePower: 0 },
  unlocks: { dog: false, rate15: false, rate2: false, rate3: false },
  records: [],
});

class MetaProgression {
  private data: SaveData = this.load();

  private load(): SaveData {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      const data = saved ? { ...fresh(), ...saved, upgrades: { ...fresh().upgrades, ...saved.upgrades }, unlocks: { ...fresh().unlocks, ...saved.unlocks } } : fresh();
      data.records = (data.records ?? []).map((run: RunRecord) => ({ ...run, mutations: run.mutations ?? 0, score: run.score ?? Math.floor(run.kills + run.time * 10) }));
      return data;
    } catch { return fresh(); }
  }

  private save() { localStorage.setItem(KEY, JSON.stringify(this.data)); }
  get gold() { return this.data.gold; }
  get totalGold() { return this.data.totalGold; }
  get level() { return RANK_GOLD.filter((need) => this.data.totalGold >= need).length; }
  nextLevelGold() { return RANK_GOLD[this.level] ?? RANK_GOLD[RANK_GOLD.length - 1]; }
  levelOf(id: MetaUpgradeId) { return this.data.upgrades[id]; }
  isUnlocked(id: UnlockId) { return this.data.unlocks[id]; }
  unlockInfo(id: UnlockId) { return UNLOCKS[id]; }
  maxRate() { return this.isUnlocked('rate3') ? 3 : this.isUnlocked('rate2') ? 2 : this.isUnlocked('rate15') ? 1.5 : 1; }

  upgradeCost(id: MetaUpgradeId) {
    const def = META_UPGRADES.find((entry) => entry.id === id)!;
    return def.base * (this.levelOf(id) + 1);
  }

  buyUpgrade(id: MetaUpgradeId) {
    const def = META_UPGRADES.find((entry) => entry.id === id)!;
    const cost = this.upgradeCost(id);
    if (this.level < def.unlock || this.levelOf(id) >= 5 || this.gold < cost) return false;
    this.data.gold -= cost;
    this.data.upgrades[id]++;
    this.save();
    return true;
  }

  buyUnlock(id: UnlockId) {
    const item = UNLOCKS[id];
    if (this.isUnlocked(id) || this.level < item.level || this.gold < item.cost) return false;
    this.data.gold -= item.cost;
    this.data.unlocks[id] = true;
    this.save();
    return true;
  }

  earn(amount: number) {
    this.data.gold += amount;
    this.data.totalGold += amount;
    this.save();
  }

  record(run: RunRecord) {
    const records = [...this.data.records, run]
      .sort((a, b) => b.score - a.score || b.time - a.time || b.kills - a.kills)
      .slice(0, 5);
    this.data.records = records;
    this.save();
    return records.indexOf(run) + 1 || 0;
  }

  bestTime() { return this.data.records[0]?.time ?? 0; }
  records() { return this.data.records; }

  apply(p: PlayerState) {
    const lv = (id: MetaUpgradeId) => this.levelOf(id);
    const previousMax = p.maxHp;
    p.maxHp *= 1 + lv('hp') * 0.05;
    p.hp = Math.min(p.maxHp, p.hp + Math.max(0, p.maxHp - previousMax));
    p.speed *= 1 + lv('speed') * 0.03;
    p.damageMult *= 1 + lv('damage') * 0.04;
    p.magnet *= 1 + lv('magnet') * 0.12;
    p.xpMult = 1 + lv('xp') * 0.08;
    p.projectileSpeedMult = 1 + lv('projectile') * 0.08;
    p.projectileLifeMult = 1 + lv('projectile') * 0.08;
    p.cooldownMult *= 1 / (1 + lv('attackSpeed') * 0.04);
    p.auraCooldownMult = 1 / (1 + lv('auraSpeed') * 0.08);
    p.orbitSpeedMult *= 1 + lv('orbitSpeed') * 0.08;
    p.areaMult *= 1 + lv('area') * 0.06;
  }

  healDropChance() { return 0.002 + this.levelOf('healDrop') * 0.005; }
  healAmount() { return Math.round(14 * (1 + this.levelOf('healPower') * 0.12)); }
  rarePower() { return 1 + this.levelOf('rarePower') * 0.08; }
}

export const meta = new MetaProgression();
