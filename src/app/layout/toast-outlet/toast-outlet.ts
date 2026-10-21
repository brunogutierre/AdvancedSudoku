import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Toast, ToastService } from '../../core/toast/toast.service';
import { Icon } from '../../shared/ui/icon/icon';

/** Polite live region that renders ToastService's queue, bottom center. */
@Component({
  selector: 'app-toast-outlet',
  imports: [Icon, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-live': 'polite' },
  template: `
    @for (toast of service.toasts(); track toast.id) {
      <div class="toast">
        <p>{{ toast.message }}</p>
        @if (toast.action; as action) {
          <button type="button" class="action" (click)="run(toast)">{{ action.label }}</button>
        }
        <button
          type="button"
          class="dismiss"
          [attr.aria-label]="'toast.dismiss' | transloco"
          (click)="service.dismiss(toast.id)"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </div>
    }
  `,
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  protected readonly service = inject(ToastService);

  protected run(toast: Toast): void {
    toast.action?.run();
    this.service.dismiss(toast.id);
  }
}
