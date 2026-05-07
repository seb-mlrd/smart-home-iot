import { Component, input, OnChanges, OnInit, signal, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TelemetryService } from '../../../core/services/telemetry.service';
import { TelemetryPeriod, TelemetryResolution, TelemetryStats } from '../../../core/models/telemetry.model';

@Component({
  selector: 'app-time-series-chart',
  standalone: true,
  providers: [provideCharts(withDefaultRegisterables())],
  imports: [
    FormsModule,
    MatFormField, MatLabel, MatSelect, MatOption,
    MatIconButton, MatIcon, MatProgressSpinner, MatTooltip,
    BaseChartDirective,
  ],
  styles: [`
    :host { display: block; }

    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      align-items: center;

      .metric-select, .period-select { width: 155px; }
    }

    .stats-row {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .stat-card {
      flex: 1;
      min-width: 80px;
      background: var(--sh-bg-card, rgba(30,41,59,0.6));
      border: 1px solid var(--sh-border, rgba(51,65,85,0.8));
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--sh-text, #e2e8f0);
      font-variant-numeric: tabular-nums;
    }

    .chart-wrap {
      height: 260px;
      position: relative;
    }

    .chart-empty {
      height: 260px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #94a3b8;

      mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.3; }
      span { font-size: 0.875rem; }
    }

    .center { display: flex; justify-content: center; padding: 40px; }
  `],
  template: `
    <div class="controls">
      <mat-form-field appearance="outline" class="metric-select">
        <mat-label>Métrique</mat-label>
        <mat-select [(ngModel)]="selectedMetric" (ngModelChange)="load()">
          @for (m of metrics(); track m) {
            <mat-option [value]="m">{{ metricLabel(m) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="period-select">
        <mat-label>Période</mat-label>
        <mat-select [(ngModel)]="selectedPeriod" (ngModelChange)="load()">
          <mat-option value="1h">1 heure</mat-option>
          <mat-option value="6h">6 heures</mat-option>
          <mat-option value="24h">24 heures</mat-option>
          <mat-option value="7d">7 jours</mat-option>
          <mat-option value="30d">30 jours</mat-option>
        </mat-select>
      </mat-form-field>

      <button mat-icon-button (click)="load()" matTooltip="Actualiser">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>

    @if (stats()) {
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-label">Min</span>
          <span class="stat-value">{{ fmt(stats()!.min) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Max</span>
          <span class="stat-value">{{ fmt(stats()!.max) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Moyenne</span>
          <span class="stat-value">{{ fmt(stats()!.avg) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Dernier</span>
          <span class="stat-value">{{ fmt(stats()!.last) }}</span>
        </div>
      </div>
    }

    @if (loading()) {
      <div class="center"><mat-progress-spinner mode="indeterminate" diameter="36" /></div>
    } @else if (isEmpty()) {
      <div class="chart-empty">
        <mat-icon>show_chart</mat-icon>
        <span>Aucune donnée pour cette période.</span>
      </div>
    } @else {
      <div class="chart-wrap">
        <canvas baseChart
          [data]="chartData()"
          [options]="chartOptions"
          type="line">
        </canvas>
      </div>
    }
  `,
})
export class TimeSeriesChartComponent implements OnInit, OnChanges {
  private readonly telemetrySvc = inject(TelemetryService);

  deviceId = input.required<string>();
  metrics = input<string[]>([]);
  defaultMetric = input<string>('');
  defaultPeriod = input<TelemetryPeriod>('24h');

  selectedMetric = '';
  selectedPeriod: TelemetryPeriod = '24h';

  loading = signal(false);
  isEmpty = signal(true);
  stats = signal<TelemetryStats | null>(null);

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
    this.selectedPeriod = this.defaultPeriod();
    if (this.defaultMetric()) {
      this.selectedMetric = this.defaultMetric();
    } else if (this.metrics().length > 0) {
      this.selectedMetric = this.metrics()[0];
    }
    if (this.selectedMetric) this.load();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['metrics'] && !changes['metrics'].firstChange) {
      const m = this.metrics();
      if (m.length > 0 && !this.selectedMetric) {
        this.selectedMetric = m[0];
        this.load();
      }
    }
    if (changes['deviceId'] && !changes['deviceId'].firstChange) {
      this.load();
    }
  }

  load() {
    if (!this.deviceId() || !this.selectedMetric) return;
    this.loading.set(true);

    const now = new Date();
    const from = this.periodStart(now);

    forkJoin({
      points: this.telemetrySvc.getHistory(this.deviceId(), {
        metric: this.selectedMetric,
        from: from.toISOString(),
        to: now.toISOString(),
        resolution: this.resolution(),
      }),
      stats: this.telemetrySvc.getStats(this.deviceId(), this.selectedMetric, this.selectedPeriod)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ points, stats }) => {
        this.stats.set(stats && stats.count > 0 ? stats : null);

        const valid = points.filter(p => p.value !== null);
        this.isEmpty.set(valid.length === 0);

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
            data: points.map(p => p.value),
            label: this.selectedMetric,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2,
            pointRadius: valid.length > 80 ? 0 : 2,
            tension: 0.3,
            fill: true,
          }],
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.isEmpty.set(true);
        this.stats.set(null);
      },
    });
  }

  metricLabel(metric: string): string {
    switch (metric) {
      case 'temperature':         return 'Température';
      case 'humidity':            return 'Humidité';
      case 'target_temperature':  return 'Consigne';
      case 'heating_active':      return 'Chauffage';
      case 'co2_ppm':             return 'CO₂';
      case 'pm25':                return 'Particules fines';
      case 'air_quality_index':   return 'Qualité de l\'air';
      case 'power_w':             return 'Puissance';
      case 'voltage_v':           return 'Tension';
      case 'current_a':           return 'Intensité';
      case 'energy_kwh_total':    return 'Énergie totale';
      case 'is_on':               return 'État';
      case 'motion_detected':     return 'Mouvement';
      case 'door_open':           return 'Porte ouverte';
      case 'battery_level':       return 'Batterie';
      case 'lux':                 return 'Luminosité';
      case 'position':            return 'Position';
      default:                    return metric;
    }
  }

  fmt(val: number | null | undefined): string {
    if (val === null || val === undefined) return '—';
    return Number.isInteger(val) ? String(val) : parseFloat(val.toFixed(2)).toString();
  }

  private periodStart(now: Date): Date {
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

  private resolution(): TelemetryResolution {
    switch (this.selectedPeriod) {
      case '1h': return 'raw';
      case '6h': return '5m';
      case '24h': return '1h';
      default: return '1d';
    }
  }
}
