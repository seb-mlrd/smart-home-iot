import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DeviceService } from '../../../core/services/device.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-command-button',
  standalone: true,
  imports: [FormsModule, MatButton, MatIcon, MatFormField, MatLabel, MatInput, MatSlideToggle, MatProgressSpinner],
  styles: [`
    .command-card {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: border-color 0.15s;

      &:hover { border-color: rgba(59, 130, 246, 0.4); }
    }

    .cmd-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .cmd-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sh-accent);
      flex-shrink: 0;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .cmd-meta { flex: 1; min-width: 0; }

    .cmd-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #f1f5f9;
      font-family: monospace;
      line-height: 1.3;
    }

    .cmd-description {
      font-size: 0.77rem;
      color: #94a3b8;
      margin-top: 3px;
      line-height: 1.4;
    }

    .cmd-body { display: flex; flex-direction: column; gap: 12px; }

    .instant-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .instant-toggle-state {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--sh-text-muted);

      &.on { color: #22c55e; }
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toggle-label {
      font-size: 0.82rem;
      color: var(--sh-text-muted);
      min-width: 32px;
    }

    .cmd-actions { display: flex; align-items: center; gap: 10px; }

    .send-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 36px;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .feedback {
      font-size: 0.78rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;

      mat-icon { font-size: 14px; width: 14px; height: 14px; }

      &.success { color: #22c55e; }
      &.error { color: #ef4444; }
    }
  `],
  template: `
    <div class="command-card">
      <div class="cmd-header">
        <div class="cmd-icon-wrap">
          <mat-icon>{{ icon() }}</mat-icon>
        </div>
        <div class="cmd-meta">
          <div class="cmd-label">{{ label() || command() }}</div>
          @if (description()) {
            <div class="cmd-description">{{ description() }}</div>
          }
        </div>
      </div>

      <div class="cmd-body">
        @if (isInstantToggle()) {
          <!-- toggle : switch = action immédiate, pas de bouton Envoyer -->
          <div class="instant-toggle-row">
            <span class="instant-toggle-state" [class.on]="toggleValue">
              {{ toggleValue ? 'On' : 'Off' }}
            </span>
            <mat-slide-toggle
              [checked]="toggleValue"
              [disabled]="loading()"
              color="primary"
              (change)="onInstantToggle($event)" />
          </div>
          @if (loading()) {
            <mat-progress-spinner diameter="16" mode="indeterminate" />
          }
          @if (successMsg()) {
            <span class="feedback success">
              <mat-icon>check_circle</mat-icon>
              Envoyée !
            </span>
          }
          @if (errorMsg()) {
            <span class="feedback error">
              <mat-icon>error</mat-icon>
              Échec d'envoi
            </span>
          }
        } @else {
          @if (isToggle()) {
            <div class="toggle-row">
              <span class="toggle-label">{{ toggleValue ? 'On' : 'Off' }}</span>
              <mat-slide-toggle [(ngModel)]="toggleValue" color="primary" />
            </div>
          } @else if (withValueInput()) {
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>{{ valueLabel() }}</mat-label>
              <input matInput [(ngModel)]="inputValue" [type]="valueType()" />
            </mat-form-field>
          }

          <div class="cmd-actions">
            <button mat-flat-button class="send-btn" (click)="send()" [disabled]="loading()">
              @if (loading()) {
                <mat-progress-spinner diameter="16" mode="indeterminate" />
              } @else {
                <mat-icon>send</mat-icon>
              }
              Envoyer
            </button>

            @if (successMsg()) {
              <span class="feedback success">
                <mat-icon>check_circle</mat-icon>
                Envoyée !
              </span>
            }
            @if (errorMsg()) {
              <span class="feedback error">
                <mat-icon>error</mat-icon>
                Échec d'envoi
              </span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class CommandButtonComponent {
  private readonly deviceSvc = inject(DeviceService);

  deviceId = input.required<string>();
  command = input.required<string>();
  label = input<string>('');
  icon = input<string>('send');
  description = input<string>('');
  withValueInput = input<boolean>(false);
  isToggle = input<boolean>(false);
  isInstantToggle = input<boolean>(false);
  valueLabel = input<string>('Valeur');
  valueType = input<'text' | 'number'>('number');
  payloadKey = input<string>('value');

  sent = output<void>();

  loading = signal(false);
  successMsg = signal('');
  errorMsg = signal('');
  inputValue = '';
  toggleValue = false;

  onInstantToggle(event: MatSlideToggleChange) {
    this.toggleValue = event.checked;
    this.send();
  }

  send() {
    this.loading.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    let payload: Record<string, unknown> | undefined;
    if (this.isToggle()) {
      payload = { [this.payloadKey()]: this.toggleValue };
    } else if (this.withValueInput() && this.inputValue !== '') {
      const key = this.payloadKey();
      const num = Number(this.inputValue);
      payload = { [key]: isNaN(num) ? this.inputValue : num };
    }

    this.deviceSvc.sendCommand(this.deviceId(), {
      command: this.command(),
      payload,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMsg.set('Envoyée !');
        this.sent.emit();
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Échec d\'envoi');
        this.toggleValue = !this.toggleValue;
        setTimeout(() => this.errorMsg.set(''), 4000);
      },
    });
  }
}
