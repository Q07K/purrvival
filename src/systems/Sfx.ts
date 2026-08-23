type Effect = 'fire' | 'hit' | 'kill' | 'pickup' | 'levelup' | 'hurt' | 'pause';

const cooldown: Record<Effect, number> = {
  fire: 0.07, hit: 0.055, kill: 0.08, pickup: 0.045, levelup: 0.25, hurt: 0.3, pause: 0.15,
};

class Sfx {
  private ctx?: AudioContext;
  private last: Partial<Record<Effect, number>> = {};

  unlock() {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(effect: Effect) {
    this.unlock();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (now - (this.last[effect] ?? -Infinity) < cooldown[effect] || ctx.state !== 'running') return;
    this.last[effect] = now;

    const sounds: Record<Effect, [number, number, OscillatorType, number, number]> = {
      fire: [520, 0.07, 'triangle', 0.045, 760], hit: [190, 0.045, 'square', 0.025, 120],
      kill: [300, 0.09, 'triangle', 0.04, 520], pickup: [780, 0.06, 'sine', 0.035, 1050],
      levelup: [440, 0.24, 'sine', 0.06, 880], hurt: [130, 0.12, 'sawtooth', 0.05, 80],
      pause: [340, 0.07, 'sine', 0.04, 260],
    };
    const [from, duration, type, volume, to] = sounds[effect];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
}

export const sfx = new Sfx();
