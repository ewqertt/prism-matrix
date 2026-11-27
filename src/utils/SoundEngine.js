export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, endFreq, duration, type = 'sine', volume = 0.08) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playShoot(towerType) {
    switch (towerType) {
      case 'pulse':
        this.playTone(680, 260, 0.09, 'triangle', 0.06);
        break;
      case 'frost':
        this.playTone(420, 180, 0.18, 'sine', 0.07);
        break;
      case 'rail':
        this.playTone(980, 140, 0.24, 'sawtooth', 0.07);
        break;
      case 'arc':
        this.playTone(760, 320, 0.14, 'square', 0.045);
        break;
    }
  }

  playBuild() {
    this.playTone(320, 640, 0.14, 'sine', 0.09);
  }

  playUpgrade() {
    this.playTone(440, 880, 0.18, 'triangle', 0.09);
  }

  playEnemyHit(isCrit = false) {
    if (isCrit) {
      this.playTone(920, 480, 0.08, 'sawtooth', 0.05);
    } else {
      this.playTone(240, 110, 0.05, 'sine', 0.035);
    }
  }

  playEnemyDie() {
    this.playTone(300, 75, 0.15, 'triangle', 0.07);
  }

  playCoreDamage() {
    this.playTone(150, 48, 0.32, 'sawtooth', 0.14);
  }

  playCardSelect() {
    this.playTone(520, 1040, 0.22, 'sine', 0.1);
  }
}

export const soundEngine = new SoundEngine();
