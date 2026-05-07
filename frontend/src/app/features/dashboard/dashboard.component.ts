import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DeviceService } from '../../core/services/device.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { Device, DeviceStatus } from '../../core/models/device.model';
import { TelemetryPoint } from '../../core/models/telemetry.model';
import { DeviceCardComponent } from '../../shared/components/device-card/device-card.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatAnchor, MatIcon, MatProgressSpinner, DeviceCardComponent],
  styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 28px;
      flex-wrap: wrap;

      h1 { margin: 0; font-size: 1.6rem; font-weight: 700; color: var(--sh-text); }
      p { margin: 4px 0 0; color: var(--sh-text-muted); font-size: 0.875rem; }
    }

    .header-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

    .ws-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      color: var(--sh-online);
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 20px;
      padding: 4px 10px;

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

      .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--sh-text); line-height: 1; }
      .stat-label { font-size: 0.8rem; color: var(--sh-text-muted); margin-top: 4px; }
    }

    .section-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--sh-text);
      margin-bottom: 16px;
    }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 56px 24px;
      color: var(--sh-text-muted);

      mat-icon { font-size: 52px; width: 52px; height: 52px; opacity: 0.3; display: block; margin: 0 auto 14px; }
      p { margin: 0 0 20px; }
    }

    .center { display: flex; justify-content: center; padding: 60px; }

    @media (max-width: 640px) {
      .page-header {
        margin-bottom: 20px;
        h1 { font-size: 1.3rem; }
      }

      .stats-grid { grid-template-columns: 1fr; gap: 10px; margin-bottom: 20px; }

      .stat-card { padding: 14px 16px; }

      .devices-grid { grid-template-columns: 1fr; gap: 12px; }

      .ws-badge { display: none; }
    }

    @media (min-width: 641px) and (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .devices-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    }
  `],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>Vue d'ensemble de vos appareils connectés</p>
      </div>
      <div class="header-actions">
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
          <div>
            <div class="stat-value">{{ devices().length }}</div>
            <div class="stat-label">Total appareils</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon online"><mat-icon>wifi</mat-icon></div>
          <div>
            <div class="stat-value">{{ onlineCount() }}</div>
            <div class="stat-label">En ligne</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon offline"><mat-icon>wifi_off</mat-icon></div>
          <div>
            <div class="stat-value">{{ offlineCount() }}</div>
            <div class="stat-label">Hors ligne</div>
          </div>
        </div>
      </div>

      <div class="section-title">Appareils ({{ devices().length }})</div>

      <div class="devices-grid">
        @for (entry of deviceEntries(); track entry.device.id) {
          <app-device-card [device]="entry.device" [liveMetrics]="entry.metrics" />
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
  private readonly authSvc = inject(AuthService);
  private readonly subs: Subscription[] = [];

  devices = signal<Device[]>([]);
  liveMap = signal<Map<string, TelemetryPoint[]>>(new Map());
  loading = signal(true);
  wsConnected = signal(false);

  onlineCount = computed(() => this.devices().filter(d => d.status === 'ONLINE').length);
  offlineCount = computed(() => this.devices().filter(d => d.status !== 'ONLINE').length);

  deviceEntries = computed(() =>
    this.devices().map(device => ({
      device,
      metrics: this.liveMap().get(device.id) ?? [],
    }))
  );

  ngOnInit() {
    this.deviceSvc.getAll().subscribe({
      next: (data) => { this.devices.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.wsSvc.connect();
    this.wsConnected.set(true);
    this.subscribeToStatusUpdates();
  }

  private subscribeToStatusUpdates() {
    const userId = this.authSvc.currentUser()?.id;
    if (!userId) return;
    const sub = this.wsSvc.watchStatus(userId).subscribe({
      next: ({ deviceId, status }) => {
        this.devices.update(list =>
          list.map(d => d.id === deviceId ? { ...d, status: status as DeviceStatus } : d)
        );
      },
    });
    this.subs.push(sub);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
