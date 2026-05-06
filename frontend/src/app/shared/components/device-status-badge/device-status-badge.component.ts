import { Component, input } from '@angular/core';
import { DeviceStatus } from '../../../core/models/device.model';

@Component({
  selector: 'app-device-status-badge',
  standalone: true,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;

      &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }

      &.online {
        color: #22c55e;
        background: rgba(34, 197, 94, 0.12);
      }

      &.offline {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.12);
      }

      &.error {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.12);
      }
    }
  `],
  template: `
    <span class="badge" [class]="status().toLowerCase()">
      {{ label() }}
    </span>
  `,
})
export class DeviceStatusBadgeComponent {
  status = input.required<DeviceStatus>();

  label() {
    switch (this.status()) {
      case 'ONLINE': return 'En ligne';
      case 'OFFLINE': return 'Hors ligne';
      case 'ERROR': return 'Erreur';
    }
  }
}
