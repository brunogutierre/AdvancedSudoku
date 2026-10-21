import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { prefersReducedMotion } from '../../../core/theme/theme-transition';

export const CONFETTI_MS = 1800;
const GOLD = '#F2C94C';
const ACCENTS = ['--easy', '--medium', '--hard', '--insane', '--primary'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  color: string;
  round: boolean;
}

/**
 * One burst of confetti from the top center on a full-screen canvas (no library): 120 pieces
 * (60 on phones, or `count`), gravity + drag, gone after 1.8s. Nothing under reduced motion.
 */
@Component({
  selector: 'app-confetti',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<canvas></canvas>`,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 70;
      pointer-events: none;
    }
    canvas {
      width: 100%;
      height: 100%;
    }
  `,
})
export class Confetti {
  readonly count = input<number>();
  readonly done = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private frame = 0;

  constructor() {
    afterNextRender(() => this.start());
    inject(DestroyRef).onDestroy(() => this.document.defaultView?.cancelAnimationFrame(this.frame));
  }

  private start(): void {
    const view = this.document.defaultView;
    const canvas = this.host.nativeElement.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!view || !canvas || !ctx || prefersReducedMotion(this.document)) {
      this.done.emit();
      return;
    }
    const width = (canvas.width = view.innerWidth);
    const height = (canvas.height = view.innerHeight);
    const colors = [...ACCENTS.map((name) => this.resolve(name)), GOLD];
    const total = this.count() ?? (width < 600 ? 60 : 120);
    const pieces: Piece[] = Array.from({ length: total }, (_, i) => ({
      x: width / 2,
      y: -10,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * 8 + 2,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: colors[i % colors.length],
      round: i % 3 === 0,
    }));
    const started = view.performance.now();
    const step = (now: number) => {
      const elapsed = now - started;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.min(1, (CONFETTI_MS - elapsed) / 300);
      for (const p of pieces) {
        p.vy += 0.25;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-3, -5, 6, 10);
        }
        ctx.restore();
      }
      if (elapsed < CONFETTI_MS) {
        this.frame = view.requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, width, height);
        this.done.emit();
      }
    };
    this.frame = view.requestAnimationFrame(step);
  }

  /** Resolves a color token (light-dark() included) through a probe element. */
  private resolve(token: string): string {
    const probe = this.document.createElement('span');
    probe.style.color = `var(${token})`;
    this.host.nativeElement.append(probe);
    const color = this.document.defaultView!.getComputedStyle(probe).color;
    probe.remove();
    return color || GOLD;
  }
}
