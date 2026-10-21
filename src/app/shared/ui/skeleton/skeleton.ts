import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Placeholder block with a diagonal shimmer (a slow pulse under reduced motion). */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
  template: '',
  styles: `
    :host {
      display: block;
      background: linear-gradient(
          110deg,
          transparent 30%,
          color-mix(in srgb, var(--surface) 70%, transparent) 50%,
          transparent 70%
        )
        var(--surface-2);
      background-size: 250% 100%;
      animation: shimmer 1.4s linear infinite;
    }
    @keyframes shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -150% 0;
      }
    }
    @keyframes pulse {
      50% {
        opacity: 0.6;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        background-image: none;
        animation: pulse 2s ease-in-out infinite !important;
        animation-duration: 2s !important;
        animation-iteration-count: infinite !important;
      }
    }
  `,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1em');
  readonly radius = input('var(--r-sm)');
}
