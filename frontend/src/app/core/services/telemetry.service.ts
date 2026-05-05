import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TelemetryHistoryParams, TelemetryHistoryPoint, TelemetryPeriod, TelemetryPoint, TelemetryStats } from '../models/telemetry.model';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly api = inject(ApiService);

  getLatest(deviceId: string): Observable<TelemetryPoint[]> {
    return this.api.get<TelemetryPoint[]>(`/devices/${deviceId}/telemetry/latest`);
  }

  getHistory(deviceId: string, params: TelemetryHistoryParams): Observable<TelemetryHistoryPoint[]> {
    const queryParams: Record<string, string> = {
      metric: params.metric,
      from: params.from,
      to: params.to,
    };
    if (params.resolution) queryParams['resolution'] = params.resolution;
    return this.api.get<TelemetryHistoryPoint[]>(`/devices/${deviceId}/telemetry/history`, queryParams);
  }

  getStats(deviceId: string, metric: string, period: TelemetryPeriod = '24h'): Observable<TelemetryStats> {
    return this.api.get<TelemetryStats>(`/devices/${deviceId}/telemetry/stats`, { metric, period });
  }
}
