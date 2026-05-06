import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DecimalPipe } from '@angular/common';
import { DeviceService } from '../../core/services/device.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Device } from '../../core/models/device.model';
import { TelemetryPoint } from '../../core/models/telemetry.model';
import { Subscription } from 'rxjs';

interface DeviceWithLive {
  device: Device;
  liveMetrics: TelemetryPoint[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatAnchor, MatIcon, MatProgressSpinner, DecimalPipe],
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;

      h1 { margin: 0; font-size: 1.6rem; font-weight: 700; color: var(--sh-text); }
      p { margin: 4px 0 0; color: var(--sh-text-muted); font-size: 0.875rem; }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-card {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        mat-icon { font-size: 22px; width: 22px; height: 22px; }

        &.total { background: rgba(59, 130, 246, 0.15); color: var(--sh-accent); }
        &.online { background: rgba(34, 197, 94, 0.15); color: var(--sh-online); }
        &.offline { background: rgba(239, 68, 68, 0.15); color: var(--sh-offline); }
      }

      .stat-info {
        .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--sh-text); line-height: 1; }
        .stat-label { font-size: 0.8rem; color: var(--sh-text-muted); margin-top: 4px; }
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      h2 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--sh-text); }
    }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .device-card {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      padding: 18px;
      text-decoration: none;
      display: block;
      transition: border-color 0.15s, background 0.15s;
      cursor: pointer;

      &:hover {
        border-color: var(--sh-accent);
        background: var(--sh-bg-card-hover);
      }
    }

    .device-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 12px;

      .device-type-icon {
        width: 38px;
        height: 38px;
        background: rgba(59, 130, 246, 0.12);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sh-accent);

        mat-icon { font-size: 20px; width: 20px; height: 20px; }
      }
    }

    .device-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--sh-text);
      margin: 0 0 3px;
    }

    .device-location {
      font-size: 0.8rem;
      color: var(--sh-text-muted);
      display: flex;
      align-items: center;
      gap: 3px;
      margin-bottom: 12px;

      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .device-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .metric-chip {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--sh-border);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.78rem;
      color: var(--sh-text-muted);

      .metric-value { color: var(--sh-text); font-weight: 600; }
    }

    .last-seen {
      font-size: 0.75rem;
      color: var(--sh-text-muted);
      margin-top: 10px;
    }

    .ws-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      color: var(--sh-online);
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 20px;
      padding: 2px 8px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--sh-online);
        animation: pulse 2s infinite;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 48px 24px;
      color: var(--sh-text-muted);

      mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; display: block; margin: 0 auto 12px; }
      p { margin: 0 0 20px; }
    }

    .center { display: flex; justify-content: center; padding: 60px; }
  `],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>Vue d'ensemble de vos appareils connectés</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        @if (wsConnected()) {
          <span class="ws-badge"><span class="dot"></span>Temps réel</span>
        }
        <a mat-flat-button routerLink="/devices/add">
          <mat-icon>add</mat-icon>
          Ajouter un appareil
        </a>
      </div>
    </div>

    @if (loading()) {
      <div class="center"><mat-progress-spinner mode="indeterminate" diameter="40" /></div>
    } @else {
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total"><mat-icon>devices</mat-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ devices().length }}</div>
            <div class="stat-label">Total appareils</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon online"><mat-icon>wifi</mat-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ onlineCount() }}</div>
            <div class="stat-label">En ligne</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon offline"><mat-icon>wifi_off</mat-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ offlineCount() }}</div>
            <div class="stat-label">Hors ligne</div>
          </div>
        </div>
      </div>

      <div class="section-header">
        <h2>Appareils</h2>
      </div>

      <div class="devices-grid">
        @for (dw of devicesWithLive(); track dw.device.id) {
          <a class="device-card" [routerLink]="['/devices', dw.device.id]">
            <div class="device-card-header">
              <div class="device-type-icon">
                <mat-icon>{{ getDeviceIcon(dw.device.deviceTypeName) }}</mat-icon>
              </div>
              <span class="status-badge" [class]="dw.device.status.toLowerCase()">
                {{ dw.device.status }}
              </span>
            </div>

            <div class="device-name">{{ dw.device.name }}</div>
            <div class="device-location">
              <mat-icon>location_on</mat-icon>
              {{ dw.device.location }}
            </div>

            @if (dw.liveMetrics.length > 0) {
              <div class="device-metrics">
                @for (m of dw.liveMetrics.slice(0, 3); track m.metric) {
                  <span class="metric-chip">
                    {{ m.metric }}: <span class="metric-value">{{ m.value | number:'1.0-1' }} {{ m.unit ?? '' }}</span>
                  </span>
                }
              </div>
            }

            @if (dw.device.lastSeenAt) {
              <div class="last-seen">Vu {{ formatLastSeen(dw.device.lastSeenAt) }}</div>
            }
          </a>
        } @empty {
          <div class="empty-state">
            <mat-icon>devices_other</mat-icon>
            <p>Aucun appareil enregistré.</p>
            <a mat-flat-button routerLink="/devices/add">Ajouter mon premier appareil</a>
          </div>
        }
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly deviceSvc = inject(DeviceService);
  private readonly wsSvc = inject(WebSocketService);
  private readonly subs: Subscription[] = [];

  devices = signal<Device[]>([]);
  liveMetricsMap = signal<Map<string, TelemetryPoint[]>>(new Map());
  loading = signal(true);
  wsConnected = signal(false);

  onlineCount = computed(() => this.devices().filter(d => d.status === 'ONLINE').length);
  offlineCount = computed(() => this.devices().filter(d => d.status !== 'ONLINE').length);

  devicesWithLive = computed<DeviceWithLive[]>(() =>
    this.devices().map(device => ({
      device,
      liveMetrics: this.liveMetricsMap().get(device.id) ?? [],
    }))
  );

  ngOnInit() {
    this.loadDevices();
    this.wsSvc.connect();
    this.wsConnected.set(true);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadDevices() {
    this.deviceSvc.getAll().subscribe({
      next: (data) => {
        this.devices.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getDeviceIcon(typeName: string): string {
    const name = typeName?.toLowerCase() ?? '';
    if (name.includes('thermostat')) return 'thermostat';
    if (name.includes('air') || name.includes('co2')) return 'air';
    if (name.includes('prise') || name.includes('plug')) return 'power';
    if (name.includes('motion') || name.includes('mouvement')) return 'sensors';
    if (name.includes('volet') || name.includes('shutter')) return 'blinds';
    if (name.includes('lumi') || name.includes('light')) return 'light_mode';
    return 'device_hub';
  }

  formatLastSeen(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `il y a ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  }
}
