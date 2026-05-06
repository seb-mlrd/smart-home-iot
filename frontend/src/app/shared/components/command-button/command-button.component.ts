import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DeviceService } from '../../../core/services/device.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-command-button',
  standalone: true,
  imports: [FormsModule, MatButton, MatIcon, MatFormField, MatLabel, MatInput, MatProgressSpinner],
  styles: [`
    .command-card {
      background: rgba(59, 130, 246, 0.06);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .cmd-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f1f5f9;
      font-family: monospace;
    }

    .cmd-description {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .cmd-body { display: flex; flex-direction: column; gap: 8px; }

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
      <div class="cmd-label">{{ command() }}</div>
      @if (description()) {
        <div class="cmd-description">{{ description() }}</div>
      }

      <div class="cmd-body">
        @if (withValueInput()) {
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
              {{ successMsg() }}
            </span>
          }
          @if (errorMsg()) {
            <span class="feedback error">
              <mat-icon>error</mat-icon>
              {{ errorMsg() }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
})
export class CommandButtonComponent {
  private readonly deviceSvc = inject(DeviceService);

  deviceId = input.required<string>();
  command = input.required<string>();
  description = input<string>('');
  withValueInput = input<boolean>(false);
  valueLabel = input<string>('Valeur');
  valueType = input<'text' | 'number'>('number');

  /** Emits the sent DeviceCommand when successful */
  sent = output<void>();

  loading = signal(false);
  successMsg = signal('');
  errorMsg = signal('');
  inputValue = '';

  send() {
    this.loading.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    let payload: Record<string, unknown> | undefined;
    if (this.withValueInput() && this.inputValue !== '') {
      const num = Number(this.inputValue);
      payload = { value: isNaN(num) ? this.inputValue : num };
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
        setTimeout(() => this.errorMsg.set(''), 4000);
      },
    });
  }
}
