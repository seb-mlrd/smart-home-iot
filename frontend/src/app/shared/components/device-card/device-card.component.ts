import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { Device } from '../../../core/models/device.model';
import { TelemetryPoint } from '../../../core/models/telemetry.model';
import { DeviceStatusBadgeComponent } from '../device-status-badge/device-status-badge.component';

@Component({
  selector: 'app-device-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe, MatIcon, DeviceStatusBadgeComponent],
  styles: [`
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 18px;
      text-decoration: none;
      display: block;
      transition: border-color 0.15s, background 0.15s;
      cursor: pointer;

      &:hover {
        border-color: #3b82f6;
        background: #253347;
      }
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .type-icon {
      width: 38px;
      height: 38px;
      background: rgba(59, 130, 246, 0.12);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #3b82f6;

      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    .device-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .device-location {
      font-size: 0.8rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 3px;
      margin-bottom: 12px;

      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .metric-chip {
      background: rgba(255,255,255,0.05);
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 0.75rem;
      color: #94a3b8;

      .val { color: #f1f5f9; font-weight: 600; }
    }

    .last-seen {
      font-size: 0.73rem;
      color: #475569;
    }
  `],
  template: `
    <a class="card" [routerLink]="['/devices', device().id]">
      <div class="card-header">
        <div class="type-icon">
          <mat-icon>{{ icon() }}</mat-icon>
        </div>
        <app-device-status-badge [status]="device().status" />
      </div>

      <div class="device-name" [title]="device().name">{{ device().name }}</div>

      <div class="device-location">
        <mat-icon>location_on</mat-icon>
        {{ device().location }}
      </div>

      @if (liveMetrics().length > 0) {
        <div class="metrics">
          @for (m of liveMetrics().slice(0, 3); track m.metric) {
            <span class="metric-chip">
              {{ m.metric }}: <span class="val">{{ m.value | number:'1.0-1' }} {{ m.unit ?? '' }}</span>
            </span>
          }
        </div>
      }

      @if (device().lastSeenAt) {
        <div class="last-seen">Vu {{ lastSeen() }}</div>
      }
    </a>
  `,
})
export class DeviceCardComponent {
  device = input.required<Device>();
  liveMetrics = input<TelemetryPoint[]>([]);

  icon() {
    const name = this.device().deviceTypeName?.toLowerCase() ?? '';
    if (name.includes('thermostat')) return 'thermostat';
    if (name.includes('air') || name.includes('co2')) return 'air';
    if (name.includes('prise') || name.includes('plug')) return 'power';
    if (name.includes('motion') || name.includes('mouvement')) return 'sensors';
    if (name.includes('volet') || name.includes('shutter')) return 'blinds';
    if (name.includes('lumi') || name.includes('light')) return 'light_mode';
    return 'device_hub';
  }

  lastSeen() {
    const date = this.device().lastSeenAt;
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `il y a ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  }
}
