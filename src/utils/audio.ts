// Native 8-bit Synthesizer using Web Audio API

class RetroAudioSynth {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;

  private init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.warn("Web Audio API not supported:", e);
      }
    }
    // Resume context if suspended
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  private playTone(
    frequency: number,
    type: OscillatorType,
    duration: number,
    startVolume: number,
    endVolume: number,
    frequencyEnd?: number
  ) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    
    if (frequencyEnd) {
      osc.frequency.exponentialRampToValueAtTime(frequencyEnd, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(startVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(endVolume, 0.0001), this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Blip when selecting a piece or clicking buttons
  public playClick() {
    this.playTone(600, 'square', 0.08, 0.08, 0.001, 800);
  }

  // Classic retro sliding beep when moving a piece
  public playMove() {
    this.playTone(400, 'triangle', 0.15, 0.15, 0.001, 550);
  }

  // Crashy detune slide when capturing a piece
  public playCapture() {
    this.playTone(300, 'sawtooth', 0.22, 0.18, 0.001, 120);
  }

  // High pitch double-buzz warning for check
  public playCheck() {
    this.playTone(880, 'square', 0.12, 0.15, 0.001, 660);
    setTimeout(() => {
      this.playTone(880, 'square', 0.12, 0.15, 0.001, 660);
    }, 150);
  }

  // Fanfare for checkmate / game over
  public playGameOver(win: boolean) {
    if (win) {
      // Happy arcade victory chime
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'square', 0.25, 0.15, 0.001, freq + 10);
        }, idx * 180);
      });
    } else {
      // Melancholic fail chime
      const notes = [392.00, 349.23, 311.13, 220.00]; // G4, F4, Eb4, A3
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'sawtooth', 0.35, 0.15, 0.001, freq - 20);
        }, idx * 220);
      });
    }
  }

  // Spell cast base sweep
  public playSpellCast() {
    this.playTone(150, 'sawtooth', 0.22, 0.12, 0.001, 850);
  }

  // Spell Fireball explosion
  public playSpellFlame() {
    this.playTone(220, 'sawtooth', 0.45, 0.22, 0.001, 42);
  }

  // Spell Freeze chime
  public playSpellFreeze() {
    this.playTone(850, 'square', 0.08, 0.12, 0.001, 1150);
    setTimeout(() => {
      this.playTone(1050, 'square', 0.12, 0.1, 0.001, 1350);
    }, 80);
  }

  // Spell Teleport sci-fi slide
  public playSpellTeleport() {
    this.playTone(320, 'triangle', 0.28, 0.16, 0.001, 1050);
  }

  // Spell Summon bell chime
  public playSpellSummon() {
    this.playTone(523, 'triangle', 0.12, 0.15, 0.001, 659);
    setTimeout(() => {
      this.playTone(784, 'triangle', 0.18, 0.15, 0.001, 1046);
    }, 100);
  }
}

export const retroAudio = new RetroAudioSynth();
