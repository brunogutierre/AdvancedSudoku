import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../../../shared/ui/icon/icon';

export type PlayAction = 'undo' | 'redo' | 'erase' | 'notes' | 'hint';

/** Undo, redo, erase, notes toggle and hint, each an icon with a label below. */
@Component({
  selector: 'app-action-bar',
  imports: [TranslocoPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'toolbar', '[attr.aria-label]': 'label()' },
  template: `
    <button type="button" [disabled]="!canUndo()" (click)="action.emit('undo')">
      <app-icon name="undo" [size]="22" />
      <span>{{ 'play.actions.undo' | transloco }}</span>
    </button>
    <button type="button" [disabled]="!canRedo()" (click)="action.emit('redo')">
      <app-icon name="redo" [size]="22" />
      <span>{{ 'play.actions.redo' | transloco }}</span>
    </button>
    <button type="button" [disabled]="!canEdit()" (click)="action.emit('erase')">
      <app-icon name="erase" [size]="22" />
      <span>{{ 'play.actions.erase' | transloco }}</span>
    </button>
    <button
      type="button"
      class="notes"
      [attr.aria-pressed]="notesMode()"
      [disabled]="!canEdit()"
      (click)="action.emit('notes')"
    >
      <app-icon name="pencil" [size]="22" />
      <span>{{ 'play.actions.notes' | transloco }}</span>
      @if (notesMode()) {
        <span class="pill" aria-hidden="true">{{ 'play.actions.on' | transloco }}</span>
      }
    </button>
    <!-- Hints arrive with the hints PR: it enables this button and handles 'hint'. -->
    <button type="button" [disabled]="!hintsEnabled()" (click)="action.emit('hint')">
      <app-icon name="lightbulb" [size]="22" />
      <span>{{ 'play.actions.hint' | transloco }}</span>
    </button>
  `,
  styleUrl: './action-bar.scss',
})
export class ActionBar {
  readonly label = input.required<string>();
  readonly canUndo = input(false);
  readonly canRedo = input(false);
  readonly canEdit = input(true);
  readonly notesMode = input(false);
  readonly hintsEnabled = input(false);
  readonly action = output<PlayAction>();
}
