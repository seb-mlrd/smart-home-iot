import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DeviceService } from '../../../core/services/device.service';
import { TelemetryService } from '../../../core/services/telemetry.service';
import { Device, DeviceCommand, DeviceType } from '../../../core/models/device.model';
import { TelemetryPoint, TelemetryPeriod } from '../../../core/models/telemetry.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-device-detail',
  standalone: true,
  providers: [provideCharts(withDefaultRegisterables()), DecimalPipe, DatePipe],
  imports: [
    RouterLink, DecimalPipe, DatePipe, JsonPipe, FormsModule,
    MatButton, MatIconButton, MatIcon, MatTab, MatTabGroup,
    MatSelect, MatOption, MatFormField, MatLabel, MatProgressSpinner, MatTooltip,
    BaseChartDirective,
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

      h1 { margin: 0 0 4px; font-size: 1.4rem; font-weight: 700; color: var(--sh-text); }

      .device-meta {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        font-size: 0.8rem;
        color: var(--sh-text-muted);

        .meta-item { display: flex; align-items: center; gap: 4px; }
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 10px;
      padding: 16px;

      .metric-name { font-size: 0.75rem; color: var(--sh-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
      .metric-value { font-size: 1.6rem; font-weight: 700; color: var(--sh-text); line-height: 1; }
      .metric-unit { font-size: 0.8rem; color: var(--sh-text-muted); margin-top: 2px; }
    }

    .tabs-section {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      overflow: hidden;
    }

    .tab-content { padding: 20px; }

    .chart-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;

      .metric-select, .period-select { width: 160px; }
    }

    .chart-container {
      height: 280px;
      position: relative;
    }

    .chart-empty {
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sh-text-muted);
      flex-direction: column;
      gap: 8px;

      mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.3; }
    }

    .commands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .command-card {
      background: rgba(59, 130, 246, 0.06);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 10px;
      padding: 16px;

      .cmd-name { font-size: 0.875rem; font-weight: 600; color: var(--sh-text); margin-bottom: 12px; }

      .cmd-form { display: flex; flex-direction: column; gap: 8px; }
    }

    .cmd-empty {
      color: var(--sh-text-muted);
      font-size: 0.875rem;
      padding: 24px;
      text-align: center;
    }

    .history-table {
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
      }

      tr:last-child td { border-bottom: none; }
    }

    .cmd-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;

      &.sent { color: var(--sh-accent); background: rgba(59, 130, 246, 0.1); }
      &.ack { color: var(--sh-online); background: rgba(34, 197, 94, 0.1); }
      &.error { color: var(--sh-offline); background: rgba(239, 68, 68, 0.1); }
    }

    .payload-val { font-family: monospace; font-size: 0.8rem; color: var(--sh-text-muted); }

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
      <div class="device-header">
        <div class="device-icon">
          <mat-icon>{{ getDeviceIcon(device()!.deviceTypeName) }}</mat-icon>
        </div>
        <div class="device-info">
          <h1>{{ device()!.name }}</h1>
          <div class="device-meta">
            <span class="meta-item">
              <mat-icon>category</mat-icon>
              {{ device()!.deviceTypeName }}
            </span>
            <span class="meta-item">
              <mat-icon>location_on</mat-icon>
              {{ device()!.location }}
            </span>
            <span class="meta-item">
              <mat-icon>tag</mat-icon>
              {{ device()!.mqttClientId }}
            </span>
            @if (device()!.lastSeenAt) {
              <span class="meta-item">
                <mat-icon>access_time</mat-icon>
                {{ device()!.lastSeenAt | date:'dd/MM/yyyy HH:mm' }}
              </span>
            }
          </div>
        </div>
        <span class="status-badge" [class]="device()!.status.toLowerCase()">
          {{ device()!.status }}
        </span>
      </div>

      <!-- Métriques temps réel -->
      @if (latestMetrics().length > 0) {
        <div class="metrics-grid">
          @for (m of latestMetrics(); track m.metric) {
            <div class="metric-card">
              <div class="metric-name">{{ m.metric }}</div>
              <div class="metric-value">{{ m.value | number:'1.0-2' }}</div>
              <div class="metric-unit">{{ m.unit ?? '' }}</div>
            </div>
          }
        </div>
      }

      <!-- Onglets -->
      <div class="tabs-section">
        <mat-tab-group mat-stretch-tabs="false" animationDuration="150ms">

          <!-- Graphique historique -->
          <mat-tab label="Historique">
            <div class="tab-content">
              <div class="chart-controls">
                <mat-form-field appearance="outline" class="metric-select">
                  <mat-label>Métrique</mat-label>
                  <mat-select [(value)]="selectedMetric" (valueChange)="loadChart()">
                    @for (m of metricNames(); track m) {
                      <mat-option [value]="m">{{ m }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="period-select">
                  <mat-label>Période</mat-label>
                  <mat-select [(value)]="selectedPeriod" (valueChange)="loadChart()">
                    <mat-option value="1h">1 heure</mat-option>
                    <mat-option value="6h">6 heures</mat-option>
                    <mat-option value="24h">24 heures</mat-option>
                    <mat-option value="7d">7 jours</mat-option>
                    <mat-option value="30d">30 jours</mat-option>
                  </mat-select>
                </mat-form-field>

                <button mat-icon-button (click)="loadChart()" matTooltip="Actualiser">
                  <mat-icon>refresh</mat-icon>
                </button>
              </div>

              @if (chartLoading()) {
                <div class="center"><mat-progress-spinner mode="indeterminate" diameter="36" /></div>
              } @else if (chartData().datasets[0].data.length === 0) {
                <div class="chart-empty">
                  <mat-icon>show_chart</mat-icon>
                  <span>Aucune donnée pour cette période.</span>
                </div>
              } @else {
                <div class="chart-container">
                  <canvas baseChart
                    [data]="chartData()"
                    [options]="chartOptions"
                    type="line">
                  </canvas>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Commandes -->
          <mat-tab label="Commandes">
            <div class="tab-content">
              @if (availableCommands().length === 0) {
                <div class="cmd-empty">Aucune commande disponible pour ce type d'appareil.</div>
              } @else {
                <div class="commands-grid">
                  @for (cmd of availableCommands(); track cmd) {
                    <div class="command-card">
                      <div class="cmd-name">{{ cmd }}</div>
                      <div class="cmd-form">
                        @if (cmd === 'set_temperature' || cmd === 'set_state') {
                          <mat-form-field appearance="outline">
                            <mat-label>Valeur</mat-label>
                            <input matInput [(ngModel)]="cmdPayloads[cmd]" type="text" />
                          </mat-form-field>
                        }
                        <button mat-flat-button
                          [disabled]="cmdLoading[cmd]"
                          (click)="sendCommand(cmd)">
                          @if (cmdLoading[cmd]) {
                            <mat-progress-spinner diameter="16" mode="indeterminate" />
                          } @else {
                            <mat-icon>send</mat-icon>
                          }
                          Envoyer
                        </button>
                        @if (cmdFeedback[cmd]) {
                          <span style="font-size:0.78rem;color:var(--sh-online)">{{ cmdFeedback[cmd] }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </mat-tab>

          <!-- Historique des commandes -->
          <mat-tab label="Historique commandes">
            <div class="tab-content">
              @if (commandHistory().length === 0) {
                <div class="cmd-empty">Aucune commande envoyée.</div>
              } @else {
                <table class="history-table">
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
                        <td class="payload-val">{{ cmd.payload ? (cmd.payload | json) : '—' }}</td>
                        <td>
                          <span class="cmd-status" [class]="cmd.status.toLowerCase()">{{ cmd.status }}</span>
                        </td>
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
  private readonly subs: Subscription[] = [];

  device = signal<Device | null>(null);
  deviceType = signal<DeviceType | null>(null);
  loading = signal(true);
  latestMetrics = signal<TelemetryPoint[]>([]);
  commandHistory = signal<DeviceCommand[]>([]);
  chartLoading = signal(false);

  selectedMetric = '';
  selectedPeriod: TelemetryPeriod = '24h';

  cmdPayloads: Record<string, string> = {};
  cmdLoading: Record<string, boolean> = {};
  cmdFeedback: Record<string, string> = {};

  metricNames = computed(() => this.latestMetrics().map(m => m.metric));

  availableCommands = computed(() => {
    const dt = this.deviceType();
    return dt?.capabilities?.commands ?? [];
  });

  chartData = signal<ChartData<'line'>>({
    labels: [],
    datasets: [{
      data: [],
      label: '',
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
      fill: true,
    }],
  });

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', maxTicksLimit: 8 },
        grid: { color: 'rgba(51,65,85,0.5)' },
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(51,65,85,0.5)' },
      },
    },
  };

  ngOnInit() {
    const deviceId = this.route.snapshot.paramMap.get('id')!;
    this.loadDevice(deviceId);
    this.loadCommandHistory(deviceId);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadDevice(id: string) {
    this.deviceSvc.getById(id).subscribe({
      next: (device) => {
        this.device.set(device);
        this.loading.set(false);
        this.loadLatestMetrics(id);
        this.loadDeviceType(device.deviceTypeId);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadDeviceType(deviceTypeId: string) {
    this.deviceSvc.getDeviceTypes().subscribe({
      next: (types) => {
        const found = types.find(t => t.id === deviceTypeId) ?? null;
        this.deviceType.set(found);
      },
    });
  }

  private loadLatestMetrics(deviceId: string) {
    this.telemetrySvc.getLatest(deviceId).subscribe({
      next: (metrics) => {
        this.latestMetrics.set(metrics);
        if (metrics.length > 0 && !this.selectedMetric) {
          this.selectedMetric = metrics[0].metric;
          this.loadChart();
        }
      },
    });
  }

  private loadCommandHistory(deviceId: string) {
    this.deviceSvc.getCommands(deviceId).subscribe({
      next: (cmds) => this.commandHistory.set(cmds),
    });
  }

  loadChart() {
    if (!this.device() || !this.selectedMetric) return;
    this.chartLoading.set(true);

    const now = new Date();
    const from = this.getPeriodStart(now);
    const resolution = this.getResolution();

    this.telemetrySvc.getHistory(this.device()!.id, {
      metric: this.selectedMetric,
      from: from.toISOString(),
      to: now.toISOString(),
      resolution,
    }).subscribe({
      next: (points) => {
        const labels = points.map(p => {
          const d = new Date(p.time);
          if (this.selectedPeriod === '1h' || this.selectedPeriod === '6h') {
            return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          }
          return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        });

        this.chartData.set({
          labels,
          datasets: [{
            data: points.map(p => p.value ?? null),
            label: this.selectedMetric,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            fill: true,
          }],
        });
        this.chartLoading.set(false);
      },
      error: () => this.chartLoading.set(false),
    });
  }

  private getPeriodStart(now: Date): Date {
    const d = new Date(now);
    switch (this.selectedPeriod) {
      case '1h': d.setHours(d.getHours() - 1); break;
      case '6h': d.setHours(d.getHours() - 6); break;
      case '24h': d.setHours(d.getHours() - 24); break;
      case '7d': d.setDate(d.getDate() - 7); break;
      case '30d': d.setDate(d.getDate() - 30); break;
    }
    return d;
  }

  private getResolution() {
    switch (this.selectedPeriod) {
      case '1h': return 'raw' as const;
      case '6h': return '5m' as const;
      case '24h': return '1h' as const;
      default: return '1d' as const;
    }
  }

  sendCommand(command: string) {
    const device = this.device();
    if (!device) return;

    this.cmdLoading[command] = true;
    this.cmdFeedback[command] = '';

    let payload: Record<string, unknown> | undefined;
    const rawVal = this.cmdPayloads[command];
    if (rawVal !== undefined && rawVal !== '') {
      const num = Number(rawVal);
      payload = { value: isNaN(num) ? rawVal : num };
    }

    this.deviceSvc.sendCommand(device.id, { command, payload }).subscribe({
      next: (cmd) => {
        this.cmdLoading[command] = false;
        this.cmdFeedback[command] = 'Commande envoyée !';
        this.commandHistory.update(h => [cmd, ...h]);
        setTimeout(() => { this.cmdFeedback[command] = ''; }, 3000);
      },
      error: () => {
        this.cmdLoading[command] = false;
        this.cmdFeedback[command] = 'Erreur d\'envoi.';
      },
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
}
