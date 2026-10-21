import { TestBed } from '@angular/core/testing';
import { APP_STORAGE } from '../persistence/persistence.service';
import { SettingsStore } from '../settings/settings-store';
import { MemoryStorage } from '../testing/memory-storage';
import { HAPTIC_PATTERNS, HapticsService } from './haptics.service';
import { AUDIO_CONTEXT_FACTORY, SoundService } from './sound.service';

class FakeParam {
  value = 0;
  readonly calls: string[] = [];
  setValueAtTime(v: number) {
    this.calls.push(`set ${v}`);
  }
  linearRampToValueAtTime(v: number) {
    this.calls.push(`lin ${v}`);
  }
  exponentialRampToValueAtTime(v: number) {
    this.calls.push(`exp ${v}`);
  }
}

class FakeNode {
  readonly frequency = new FakeParam();
  readonly gain = new FakeParam();
  readonly detune = new FakeParam();
  type = '';
  connect<T>(next: T): T {
    return next;
  }
  start = vi.fn();
  stop = vi.fn();
}

class FakeContext {
  state = 'suspended';
  currentTime = 0;
  destination = new FakeNode();
  readonly oscillators: FakeNode[] = [];
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
  createGain = () => new FakeNode();
  createBiquadFilter = () => new FakeNode();
  createOscillator = () => {
    const osc = new FakeNode();
    this.oscillators.push(osc);
    return osc;
  };
}

describe('feedback', () => {
  let ctx: FakeContext;
  let factory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ctx = new FakeContext();
    factory = vi.fn(() => ctx);
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_STORAGE, useValue: new MemoryStorage() },
        { provide: AUDIO_CONTEXT_FACTORY, useValue: factory },
      ],
    });
  });

  afterEach(() => {
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  describe('SoundService', () => {
    it('stays silent until sound is on and the user has interacted', () => {
      const sound = TestBed.inject(SoundService);
      const settings = TestBed.inject(SettingsStore);
      settings.set('sound', false);
      document.dispatchEvent(new Event('pointerdown'));
      sound.play('place');
      expect(factory).not.toHaveBeenCalled();

      settings.set('sound', true);
      sound.play('place');
      expect(factory).toHaveBeenCalledOnce();
      expect(ctx.resume).toHaveBeenCalled();
    });

    it('waits for a gesture before creating the context', () => {
      const sound = TestBed.inject(SoundService);
      TestBed.inject(SettingsStore).set('sound', true);
      sound.play('note');
      expect(factory).not.toHaveBeenCalled();
      document.dispatchEvent(new KeyboardEvent('keydown'));
      sound.play('note');
      expect(ctx.oscillators.map((o) => o.frequency.calls[0])).toEqual(['set 1320']);
    });

    it('synthesizes every event with its own voices', () => {
      const sound = TestBed.inject(SoundService);
      TestBed.inject(SettingsStore).set('sound', true);
      document.dispatchEvent(new Event('pointerdown'));
      const voices: Record<string, number> = {};
      for (const name of [
        'place',
        'note',
        'erase',
        'error',
        'unit',
        'hint',
        'win',
        'combo',
      ] as const) {
        const before = ctx.oscillators.length;
        sound.play(name, 9);
        voices[name] = ctx.oscillators.length - before;
      }
      expect(voices).toEqual({
        place: 2,
        note: 1,
        erase: 1,
        error: 2,
        unit: 3,
        hint: 2,
        win: 7,
        combo: 5,
      });
      expect(ctx.oscillators[0].frequency.calls[0]).toBe(`set ${660 * 1.02}`);
      const erase = ctx.oscillators[3];
      expect(erase.frequency.calls).toEqual(['set 440', 'exp 330']);
      expect(ctx.oscillators.every((o) => o.start.mock.calls.length === 1)).toBe(true);
      TestBed.resetTestingModule();
      expect(ctx.close).toHaveBeenCalled();
    });
  });

  describe('HapticsService', () => {
    it('vibrates only when supported and enabled', () => {
      const haptics = TestBed.inject(HapticsService);
      expect(haptics.supported).toBe(false);
      haptics.vibrate('tap');

      const vibrate = vi.fn(() => true);
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
      haptics.vibrate('win');
      expect(vibrate).toHaveBeenCalledWith([...HAPTIC_PATTERNS.win]);

      TestBed.inject(SettingsStore).set('haptics', false);
      haptics.vibrate('error');
      expect(vibrate).toHaveBeenCalledOnce();
    });
  });
});
