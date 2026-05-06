import { Component, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [DecimalPipe, MatIcon],
  styles: [`
    .metric-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .metric-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(59, 130, 246, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #3b82f6;
      flex-shrink: 0;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .metric-value {
      font-size: 1.7rem;
      font-weight: 700;
      color: #f1f5f9;
      line-height: 1;
    }

    .metric-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .metric-unit {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .trend {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 0.75rem;
      font-weight: 600;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &.up { color: #22c55e; }
      &.down { color: #ef4444; }
      &.stable { color: #94a3b8; }
    }

    .null-value {
      font-size: 1.4rem;
      color: #334155;
    }
  `],
  template: `
    <div class="metric-card">
      <div class="card-header">
        <span class="metric-name">{{ metric() }}</span>
        <div class="metric-icon">
          <mat-icon>{{ icon() }}</mat-icon>
        </div>
      </div>

      @if (value() !== null) {
        <div class="metric-value">{{ value() | number:'1.0-2' }}</div>
      } @else {
        <div class="null-value metric-value">—</div>
      }

      <div class="metric-footer">
        <span class="metric-unit">{{ unit() ?? '' }}</span>

        @if (trend()) {
          <span class="trend" [class]="trend()!">
            <mat-icon>{{ trendIcon() }}</mat-icon>
            {{ trendLabel() }}
          </span>
        }
      </div>
    </div>
  `,
})
export class MetricCardComponent {
  metric = input.required<string>();
  value = input<number | null>(null);
  unit = input<string | null>(null);
  icon = input<string>('sensors');
  trend = input<'up' | 'down' | 'stable' | null>(null);

  trendIcon = computed(() => {
    switch (this.trend()) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  });

  trendLabel = computed(() => {
    switch (this.trend()) {
      case 'up': return 'Hausse';
      case 'down': return 'Baisse';
      default: return 'Stable';
    }
  });
}
