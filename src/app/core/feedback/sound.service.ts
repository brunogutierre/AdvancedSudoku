import { DOCUMENT, DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { SettingsStore } from '../settings/settings-store';

export type SoundName = 'place' | 'note' | 'erase' | 'error' | 'unit' | 'hint' | 'win' | 'combo';

/** Creates the AudioContext; null where Web Audio is unavailable (tests, old browsers). */
export const AUDIO_CONTEXT_FACTORY = new InjectionToken<(() => AudioContext) | null>(
  'AUDIO_CONTEXT_FACTORY',
  {
    providedIn: 'root',
    factory: () => (typeof AudioContext === 'undefined' ? null : () => new AudioContext()),
  },
);

const MASTER_GAIN = 0.18;

interface Voice {
  readonly type: OscillatorType;
  readonly freq: number;
  /** Seconds after now. */
  readonly at?: number;
  /** Envelope in ms. */
  readonly attack: number;
  readonly decay: number;
  readonly gain?: number;
  readonly glideTo?: number;
  readonly glideMs?: number;
  /** Cents. */
  readonly detune?: number;
}

const NOTE = { G4: 392, C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5, G6: 1568 };

/**
 * Tiny synthesizer for game sounds (no audio files): oscillators with an attack/decay
 * envelope, through one master gain and a gentle 6 kHz low-pass. The AudioContext is created
 * lazily, only after a user gesture (autoplay policy) and only while sound is on.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly settings = inject(SettingsStore);
  private readonly createContext = inject(AUDIO_CONTEXT_FACTORY);
  private ctx: AudioContext | null = null;
  private master: AudioNode | null = null;
  private gestured = false;

  constructor() {
    const doc = inject(DOCUMENT);
    const unlock = () => (this.gestured = true);
    const options = { capture: true, once: true } as const;
    doc.addEventListener('pointerdown', unlock, options);
    doc.addEventListener('keydown', unlock, options);
    inject(DestroyRef).onDestroy(() => {
      doc.removeEventListener('pointerdown', unlock, options);
      doc.removeEventListener('keydown', unlock, options);
      void this.ctx?.close();
    });
  }

  /** Plays a sound; `digit` varies the pitch of 'place' slightly (pentatonic-like steps). */
  play(name: SoundName, digit = 5): void {
    const out = this.output();
    if (!out) {
      return;
    }
    for (const voice of this.score(name, digit)) {
      this.voice(out.ctx, name === 'combo' ? out.retro : out.master, voice);
    }
  }

  private score(name: SoundName, digit: number): Voice[] {
    switch (name) {
      case 'place': {
        const freq = 660 * (1 + (digit - 5) * 0.005);
        return [
          { type: 'sine', freq, attack: 4, decay: 90 },
          { type: 'triangle', freq: freq * 2, attack: 4, decay: 90, gain: 0.15 },
        ];
      }
      case 'note':
        return [{ type: 'sine', freq: 1320, attack: 2, decay: 45, gain: 0.5 }];
      case 'erase':
        return [{ type: 'triangle', freq: 440, glideTo: 330, glideMs: 70, attack: 3, decay: 80 }];
      case 'error':
        return [
          { type: 'sine', freq: 220, attack: 6, decay: 180, gain: 0.6 },
          { type: 'sine', freq: 233, attack: 6, decay: 180, gain: 0.6 },
        ];
      case 'unit':
        return [NOTE.C6, NOTE.E6, NOTE.G6].map((freq, i) => ({
          type: 'sine' as const,
          freq,
          at: i * 0.06,
          attack: 4,
          decay: 160,
        }));
      case 'hint':
        return [
          { type: 'triangle', freq: NOTE.C5, attack: 10, decay: 220 },
          { type: 'triangle', freq: NOTE.G5, at: 0.12, attack: 10, decay: 220 },
        ];
      case 'win':
        return [
          ...[NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].map((freq, i) => ({
            type: 'sine' as const,
            freq,
            at: i * 0.09,
            attack: 4,
            decay: 400,
          })),
          // Sustained pad with a light chorus from two detuned oscillators.
          { type: 'sine', freq: NOTE.C5, attack: 200, decay: 900, gain: 0.35, detune: -5 },
          { type: 'sine', freq: NOTE.C5, attack: 200, decay: 900, gain: 0.35, detune: 5 },
        ];
      case 'combo':
        return [NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].map((freq, i) => ({
          type: 'square' as const,
          freq,
          at: i * 0.05,
          attack: 2,
          decay: 120,
          gain: 0.5,
        }));
    }
  }

  private output(): { ctx: AudioContext; master: AudioNode; retro: AudioNode } | null {
    if (!this.settings.sound() || !this.gestured || !this.createContext) {
      return null;
    }
    if (!this.ctx) {
      const ctx = this.createContext();
      const gain = ctx.createGain();
      gain.gain.value = MASTER_GAIN;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 6000;
      gain.connect(lowpass).connect(ctx.destination);
      this.ctx = ctx;
      this.master = gain;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    // 8-bit voice: square waves softened by a 2 kHz low-pass.
    const retro = this.ctx.createBiquadFilter();
    retro.type = 'lowpass';
    retro.frequency.value = 2000;
    retro.connect(this.master!);
    return { ctx: this.ctx, master: this.master!, retro };
  }

  private voice(ctx: AudioContext, out: AudioNode, v: Voice): void {
    const start = ctx.currentTime + (v.at ?? 0);
    const peak = start + v.attack / 1000;
    const end = peak + v.decay / 1000;
    const osc = ctx.createOscillator();
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.freq, start);
    if (v.glideTo) {
      osc.frequency.exponentialRampToValueAtTime(v.glideTo, start + (v.glideMs ?? 0) / 1000);
    }
    osc.detune.value = v.detune ?? 0;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(v.gain ?? 1, peak);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(end + 0.05);
  }
}
