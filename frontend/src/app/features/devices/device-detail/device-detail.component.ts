import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, JsonPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DeviceService } from '../../../core/services/device.service';
import { TelemetryService } from '../../../core/services/telemetry.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Device, DeviceCommand, DeviceType } from '../../../core/models/device.model';
import { TelemetryPoint } from '../../../core/models/telemetry.model';
import { Subscription } from 'rxjs';

import { DeviceStatusBadgeComponent } from '../../../shared/components/device-status-badge/device-status-badge.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { TimeSeriesChartComponent } from '../../../shared/components/time-series-chart/time-series-chart.component';
import { CommandButtonComponent } from '../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-device-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, JsonPipe,
    MatIcon,
    MatTab, MatTabGroup, MatProgressSpinner,
    DeviceStatusBadgeComponent, MetricCardComponent,
    TimeSeriesChartComponent, CommandButtonComponent,
  ],
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--sh-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      margin-bottom: 20px;
      transition: color 0.15s;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: var(--sh-text); }
    }

    .device-header {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      display: flex;
      align-items: flex-start;
      gap: 16px;

      .device-icon {
        width: 52px;
        height: 52px;
        border-radius: 12px;
        background: rgba(59, 130, 246, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sh-accent);
        flex-shrink: 0;

        mat-icon { font-size: 26px; width: 26px; height: 26px; }
      }

      .device-info { flex: 1; }
      h1 { margin: 0 0 8px; font-size: 1.4rem; font-weight: 700; color: var(--sh-text); }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        font-size: 0.8rem;
        color: var(--sh-text-muted);

        span { display: flex; align-items: center; gap: 4px; }
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .tabs-section {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      overflow: hidden;
    }

    .tab-content { padding: 20px; }

    .commands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }

    .no-commands {
      color: var(--sh-text-muted);
      font-size: 0.875rem;
      text-align: center;
      padding: 32px;
    }

    .cmd-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      th {
        text-align: left;
        padding: 8px 12px;
        color: var(--sh-text-muted);
        border-bottom: 1px solid var(--sh-border);
        font-weight: 500;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      td {
        padding: 10px 12px;
        border-bottom: 1px solid rgba(51, 65, 85, 0.5);
        color: var(--sh-text);
        vertical-align: middle;
      }

      tr:last-child td { border-bottom: none; }
    }

    .cmd-status {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;

      &.sent { color: var(--sh-accent); background: rgba(59, 130, 246, 0.1); }
      &.ack { color: var(--sh-online); background: rgba(34, 197, 94, 0.1); }
      &.error { color: var(--sh-offline); background: rgba(239, 68, 68, 0.1); }
    }

    .payload { font-family: monospace; font-size: 0.78rem; color: var(--sh-text-muted); }

    .center { display: flex; justify-content: center; padding: 80px; }
    .error-msg { color: var(--sh-offline); text-align: center; padding: 40px; }
  `],
  template: `
    <a class="back-link" routerLink="/devices">
      <mat-icon>arrow_back</mat-icon>
      Retour aux appareils
    </a>

    @if (loading()) {
      <div class="center"><mat-progress-spinner mode="indeterminate" diameter="40" /></div>
    } @else if (!device()) {
      <div class="error-msg">Appareil introuvable.</div>
    } @else {
      <!-- En-tête -->
      <div class="device-header">
        <div class="device-icon">
          <mat-icon>{{ icon() }}</mat-icon>
        </div>
        <div class="device-info">
          <h1>{{ device()!.name }}</h1>
          <div class="meta">
            <span><mat-icon>category</mat-icon>{{ device()!.deviceTypeName }}</span>
            <span><mat-icon>location_on</mat-icon>{{ device()!.location }}</span>
            <span><mat-icon>tag</mat-icon>{{ device()!.mqttClientId }}</span>
            @if (device()!.lastSeenAt) {
              <span><mat-icon>access_time</mat-icon>{{ device()!.lastSeenAt | date:'dd/MM/yyyy HH:mm' }}</span>
            }
          </div>
        </div>
        <app-device-status-badge [status]="device()!.status" />
      </div>

      <!-- Métriques -->
      @if (latestMetrics().length > 0) {
        <div class="metrics-grid">
          @for (m of latestMetrics(); track m.metric) {
            <app-metric-card
              [metric]="m.metric"
              [value]="m.value"
              [unit]="m.unit"
              [icon]="metricIcon(m.metric)" />
          }
        </div>
      }

      <!-- Onglets -->
      <div class="tabs-section">
        <mat-tab-group mat-stretch-tabs="false" animationDuration="150ms">

          <mat-tab label="Historique">
            <div class="tab-content">
              @if (latestMetrics().length > 0) {
                <app-time-series-chart
                  [deviceId]="device()!.id"
                  [metrics]="metricNames()"
                  [defaultMetric]="metricNames()[0]" />
              } @else {
                <div style="color:var(--sh-text-muted);text-align:center;padding:32px">
                  Aucune donnée de télémétrie disponible.
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Commandes">
            <div class="tab-content">
              @if (availableCommands().length === 0) {
                <div class="no-commands">Aucune commande disponible pour ce type d'appareil.</div>
              } @else {
                <div class="commands-grid">
                  @for (cmd of availableCommands(); track cmd) {
                    <app-command-button
                      [deviceId]="device()!.id"
                      [command]="cmd"
                      [withValueInput]="needsValueInput(cmd)"
                      [valueLabel]="valueLabel(cmd)"
                      (sent)="onCommandSent()" />
                  }
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Historique commandes">
            <div class="tab-content">
              @if (commandHistory().length === 0) {
                <div class="no-commands">Aucune commande envoyée.</div>
              } @else {
                <table class="cmd-table">
                  <thead>
                    <tr>
                      <th>Commande</th>
                      <th>Payload</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cmd of commandHistory(); track cmd.id) {
                      <tr>
                        <td>{{ cmd.command }}</td>
                        <td class="payload">{{ cmd.payload ? (cmd.payload | json) : '—' }}</td>
                        <td><span class="cmd-status" [class]="cmd.status.toLowerCase()">{{ cmd.status }}</span></td>
                        <td>{{ cmd.sentAt | date:'dd/MM HH:mm:ss' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>
    }
  `,
})
export class DeviceDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly deviceSvc = inject(DeviceService);
  private readonly telemetrySvc = inject(TelemetryService);
  private readonly wsSvc = inject(WebSocketService);
  private readonly authSvc = inject(AuthService);
  private readonly subs: Subscription[] = [];

  device = signal<Device | null>(null);
  deviceType = signal<DeviceType | null>(null);
  loading = signal(true);
  latestMetrics = signal<TelemetryPoint[]>([]);
  commandHistory = signal<DeviceCommand[]>([]);

  metricNames = computed(() => this.latestMetrics().map(m => m.metric));
  availableCommands = computed(() => this.deviceType()?.capabilities?.commands ?? []);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadDevice(id);
    this.loadCommandHistory(id);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadDevice(id: string) {
    this.deviceSvc.getById(id).subscribe({
      next: (d) => {
        this.device.set(d);
        this.loading.set(false);
        this.telemetrySvc.getLatest(id).subscribe({
          next: (m) => this.latestMetrics.set(m),
        });
        this.deviceSvc.getDeviceTypes().subscribe({
          next: (types) => this.deviceType.set(types.find(t => t.id === d.deviceTypeId) ?? null),
        });
        this.subscribeToLiveTelemetry(id);
      },
      error: () => this.loading.set(false),
    });
  }

  private subscribeToLiveTelemetry(deviceId: string) {
    const userId = this.authSvc.currentUser()?.id;
    if (!userId) return;
    this.wsSvc.connect();
    const sub = this.wsSvc.watchDevice(userId, deviceId).subscribe({
      next: (metrics) => this.latestMetrics.set(metrics),
    });
    this.subs.push(sub);
  }

  private loadCommandHistory(deviceId: string) {
    this.deviceSvc.getCommands(deviceId).subscribe({
      next: (cmds) => this.commandHistory.set(cmds),
    });
  }

  onCommandSent() {
    const d = this.device();
    if (d) this.loadCommandHistory(d.id);
  }

  icon() {
    const name = this.device()?.deviceTypeName?.toLowerCase() ?? '';
    if (name.includes('thermostat')) return 'thermostat';
    if (name.includes('air') || name.includes('co2')) return 'air';
    if (name.includes('prise') || name.includes('plug')) return 'power';
    if (name.includes('motion') || name.includes('mouvement')) return 'sensors';
    if (name.includes('volet') || name.includes('shutter')) return 'blinds';
    if (name.includes('lumi') || name.includes('light')) return 'light_mode';
    return 'device_hub';
  }

  metricIcon(metric: string): string {
    const m = metric.toLowerCase();
    if (m.includes('temp')) return 'thermostat';
    if (m.includes('humid')) return 'water_drop';
    if (m.includes('co2') || m.includes('air')) return 'air';
    if (m.includes('power') || m.includes('watt') || m.includes('energy')) return 'bolt';
    if (m.includes('lux') || m.includes('light')) return 'light_mode';
    if (m.includes('motion') || m.includes('door')) return 'sensors';
    if (m.includes('battery')) return 'battery_std';
    if (m.includes('voltage') || m.includes('current')) return 'electric_bolt';
    return 'sensors';
  }

  needsValueInput(command: string): boolean {
    return ['set_temperature', 'set_state', 'set_brightness', 'set_position'].includes(command);
  }

  valueLabel(command: string): string {
    if (command === 'set_temperature') return 'Température (°C)';
    if (command === 'set_position') return 'Position (0-100)';
    if (command === 'set_brightness') return 'Luminosité (0-100)';
    return 'Valeur';
  }
}
