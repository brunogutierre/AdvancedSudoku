import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {
  TranslocoPipe,
  TranslocoService,
  provideTranslocoScope,
  translateObjectSignal,
  translateSignal,
} from '@jsverse/transloco';
import type { Step } from '../../../engine';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { explainKey, explainParams, nameKey, stepTier } from './hint-view';

/**
 * Explains the open hint: technique name and level, a sentence built from the engine's
 * explain key, a legend for the board overlay, and Apply / Close. A card in the side
 * column on desktop, a bottom sheet on phones.
 */
@Component({
  selector: 'app-hint-panel',
  imports: [TranslocoPipe, Button, Icon],
  providers: [provideTranslocoScope('hints')],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    tabindex: '-1',
    '[attr.aria-label]': 'label()',
    '(keydown.escape)': 'onEscape($event)',
  },
  templateUrl: './hint-panel.html',
  styleUrl: './hint-panel.scss',
})
export class HintPanel {
  /** The hint to explain; null while it is being computed. */
  readonly step = input<Step | null>(null);
  /** 1-based number of this hint in the game. */
  readonly number = input(1);
  readonly apply = output<Step>();
  readonly closed = output<void>();

  private readonly transloco = inject(TranslocoService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Read so the explanation is rebuilt when the scope loads or the language changes (keys are scope-relative here). */
  private readonly units = translateObjectSignal('unit');
  protected readonly label = translateSignal('panel.label');

  protected readonly tier = computed(() => {
    const step = this.step();
    return step ? stepTier(step) : null;
  });
  protected readonly isMistake = computed(() => this.step()?.technique === 'mistake');
  protected readonly name = computed(() => {
    this.units();
    const step = this.step();
    return step ? this.transloco.translate(nameKey(step)) : '';
  });
  protected readonly explanation = computed(() => {
    this.units();
    const step = this.step();
    if (!step) {
      return '';
    }
    const t = (key: string, params?: Record<string, unknown>) =>
      this.transloco.translate(key, params);
    return t(explainKey(step), explainParams(step, t));
  });

  constructor() {
    // Bring keyboard and screen-reader users to the panel; Tab then reaches Apply.
    afterNextRender(() => this.host.nativeElement.focus({ preventScroll: true }));
  }

  protected onEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closed.emit();
  }
}
