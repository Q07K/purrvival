import type { PlayerState } from '../types';
import { selectedCharacter } from '../data/characters';

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
type CharacterId = 'cat' | 'dog';
export type RunRecord = { time: number; kills: number; level: number; cleared: boolean; score: number; mutations: number; character?: CharacterId };
export type LegacyTraitId = 'catClaw' | 'catMagnet' | 'dogPulse' | 'dogSpark';
type ChallengeId = 'survive10' | 'slay5000' | 'clearRun' | 'mutate3' | 'level50';

export const LEGACY_TRAITS: { id: LegacyTraitId; character: CharacterId; name: string; desc: string; mastery: number; gold: number; frame: number }[] = [
  { id: 'catClaw', character: 'cat', name: '달빛 발톱', desc: '고양이 모든 피해 +12%', mastery: 2, gold: 20000, frame: 0 },
  { id: 'catMagnet', character: 'cat', name: '별빛 수염', desc: '고양이 획득 범위 +30%', mastery: 3, gold: 30000, frame: 1 },
  { id: 'dogPulse', character: 'dog', name: '공명 목걸이', desc: '강아지 펄스 주기 -18%', mastery: 2, gold: 20000, frame: 2 },
  { id: 'dogSpark', character: 'dog', name: '번개 발바닥', desc: '강아지 무기 범위 +15%', mastery: 3, gold: 30000, frame: 3 },
];

const CHALLENGES: { id: ChallengeId; name: string; desc: string; done: (run: RunRecord) => boolean }[] = [
  { id: 'survive10', name: '긴 밤의 시작', desc: '10분 생존', done: (r) => r.time >= 600 },
  { id: 'slay5000', name: '쥐 소탕꾼', desc: '한 런에 5,000마리 처치', done: (r) => r.kills >= 5000 },
  { id: 'clearRun', name: '달빛의 수호자', desc: '20분 완주', done: (r) => r.cleared },
  { id: 'mutate3', name: '심연 탐험가', desc: '한 런에 변이/계약 3회', done: (r) => r.mutations >= 3 },
  { id: 'level50', name: '끝없는 성장', desc: '한 런에 레벨 50 달성', done: (r) => r.level >= 50 },
];

const RANK_GOLD = [0, 800, 2400, 5000, 8500, 13000, 19000, 27000, 37000, 50000, 66000, 85000, 108000, 136000, 170000, 210000, 260000, 320000, 390000, 470000];
const PRESTIGE_XP = [0, 600, 1600, 3200, 5600, 9000, 14000, 21000, 30000, 42000, 58000];
const MASTERY_XP = [0, 3, 8, 16, 28, 45];
const UNLOCKS: Record<UnlockId, { name: string; desc: string; cost: number; level: number }> = {
  rate15: { name: '1.5× 배속', desc: '전투 배속 1.5× 해금', cost: 1200, level: 3 },
  dog: { name: '강아지', desc: '펄스로 시작하는 강아지 해금', cost: 2500, level: 5 },
  rate2: { name: '2× 배속', desc: '전투 배속 2× 해금', cost: 4000, level: 7 },
  rate3: { name: '3× 배속', desc: '전투 배속 3× 해금', cost: 10000, level: 12 },
};

type SaveData = {
  gold: number; totalGold: number; upgrades: Record<MetaUpgradeId, number>; unlocks: Record<UnlockId, boolean>; records: RunRecord[];
  prestigeXp: number; moonSeals: number; mastery: Record<CharacterId, number>; traits: Record<LegacyTraitId, boolean>; challenges: Record<ChallengeId, boolean>; offeringRefunded: boolean;
};
const KEY = 'cat-survivors-meta-v1';
const fresh = (): SaveData => ({
  gold: 0, totalGold: 0,
  upgrades: { hp: 0, speed: 0, damage: 0, magnet: 0, healDrop: 0, healPower: 0, xp: 0, projectile: 0, auraSpeed: 0, orbitSpeed: 0, area: 0, attackSpeed: 0, rarePower: 0 },
  unlocks: { dog: false, rate15: false, rate2: false, rate3: false },
  records: [],
  prestigeXp: 0, moonSeals: 0,
  mastery: { cat: 0, dog: 0 },
  traits: { catClaw: false, catMagnet: false, dogPulse: false, dogSpark: false },
  challenges: { survive10: false, slay5000: false, clearRun: false, mutate3: false, level50: false },
  offeringRefunded: false,
});

class MetaProgression {
  private data: SaveData = this.load();

  private load(): SaveData {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      const data = saved ? {
        ...fresh(), ...saved, upgrades: { ...fresh().upgrades, ...saved.upgrades }, unlocks: { ...fresh().unlocks, ...saved.unlocks },
        mastery: { ...fresh().mastery, ...saved.mastery }, traits: { ...fresh().traits, ...saved.traits }, challenges: { ...fresh().challenges, ...saved.challenges },
      } : fresh();
      data.records = (data.records ?? []).map((run: RunRecord) => ({ ...run, mutations: run.mutations ?? 0, score: run.score ?? Math.floor(run.kills + run.time * 10) }));
      if (saved && saved.offeringRefunded === undefined && Object.values(data.traits).every(Boolean)) {
        data.gold += Math.floor(data.prestigeXp / 120) * 50000;
        data.offeringRefunded = true;
        localStorage.setItem(KEY, JSON.stringify(data));
      }
      return data;
    } catch { return fresh(); }
  }

  private save() { localStorage.setItem(KEY, JSON.stringify(this.data)); }
  get gold() { return this.data.gold; }
  get totalGold() { return this.data.totalGold; }
  get level() { return RANK_GOLD.filter((need) => this.data.totalGold >= need).length; }
  get legacyUnlocked() { return this.level >= RANK_GOLD.length; }
  get prestigeXp() { return this.data.prestigeXp; }
  get prestigeLevel() { return PRESTIGE_XP.filter((need) => this.data.prestigeXp >= need).length; }
  get moonSeals() { return this.data.moonSeals; }
  nextLevelGold() { return RANK_GOLD[this.level] ?? RANK_GOLD[RANK_GOLD.length - 1]; }
  nextPrestigeXp() { return PRESTIGE_XP[this.prestigeLevel] ?? PRESTIGE_XP[PRESTIGE_XP.length - 1]; }
  levelOf(id: MetaUpgradeId) { return this.data.upgrades[id]; }
  isUnlocked(id: UnlockId) { return this.data.unlocks[id]; }
  unlockInfo(id: UnlockId) { return UNLOCKS[id]; }
  maxRate() { return this.isUnlocked('rate3') ? 3 : this.isUnlocked('rate2') ? 2 : this.isUnlocked('rate15') ? 1.5 : 1; }
  masteryXp(id: CharacterId) { return this.data.mastery[id]; }
  masteryLevel(id: CharacterId) { return MASTERY_XP.filter((need) => this.data.mastery[id] >= need).length; }
  traitOwned(id: LegacyTraitId) { return this.data.traits[id]; }
  challenges() { return CHALLENGES.map((c) => ({ ...c, complete: this.data.challenges[c.id] })); }

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

  buyTrait(id: LegacyTraitId) {
    const trait = LEGACY_TRAITS.find((entry) => entry.id === id)!;
    if (!this.legacyUnlocked || this.traitOwned(id) || this.masteryLevel(trait.character) < trait.mastery || this.data.moonSeals < 1 || this.data.gold < trait.gold) return false;
    this.data.moonSeals--;
    this.data.gold -= trait.gold;
    this.data.traits[id] = true;
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

  completeRun(character: CharacterId, run: RunRecord) {
    const beforePrestige = this.prestigeLevel;
    const eligible = run.time >= 60;
    const masteryGain = eligible ? Math.max(1, Math.floor(run.time / 120) + (run.cleared ? 2 : 0)) : 0;
    this.data.mastery[character] += masteryGain;
    const completed: string[] = [];
    for (const challenge of CHALLENGES) {
      if (!this.data.challenges[challenge.id] && challenge.done(run)) {
        this.data.challenges[challenge.id] = true;
        this.data.moonSeals++;
        completed.push(challenge.name);
      }
    }
    let prestigeXp = 0;
    let seals = completed.length;
    if (this.legacyUnlocked && eligible) {
      prestigeXp = Math.max(1, Math.floor(run.time / 60) + Math.floor(run.kills / 1000) + run.mutations * 2 + (run.cleared ? 5 : 0));
      this.data.prestigeXp += prestigeXp;
      const rankUp = this.prestigeLevel - beforePrestige;
      this.data.moonSeals += Math.max(0, rankUp);
      seals += Math.max(0, rankUp);
    }
    this.save();
    return { masteryGain, masteryLevel: this.masteryLevel(character), prestigeXp, seals, challenges: completed };
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
    if (selectedCharacter.id === 'cat') {
      if (this.traitOwned('catClaw')) p.damageMult *= 1.12;
      if (this.traitOwned('catMagnet')) p.magnet *= 1.3;
    } else {
      if (this.traitOwned('dogPulse')) p.auraCooldownMult *= 0.82;
      if (this.traitOwned('dogSpark')) p.areaMult *= 1.15;
    }
  }

  healDropChance() { return 0.002 + this.levelOf('healDrop') * 0.005; }
  healAmount() { return Math.round(14 * (1 + this.levelOf('healPower') * 0.12)); }
  rarePower() { return 1 + this.levelOf('rarePower') * 0.08; }
}

export const meta = new MetaProgression();
