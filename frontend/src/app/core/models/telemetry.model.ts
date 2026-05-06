export type TelemetryResolution = 'raw' | '5m' | '1h' | '1d';
export type TelemetryPeriod = '1h' | '6h' | '24h' | '7d' | '30d';

export interface TelemetryPoint {
  metric: string;
  value: number;
  unit: string | null;
  time: string;
}

export interface TelemetryHistoryPoint {
  time: string;
  value: number | null;
  unit: string | null;
  min: number | null;
  max: number | null;
}

export interface TelemetryStats {
  metric: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  last: number | null;
  count: number;
  from: string;
  to: string;
}

export interface TelemetryHistoryParams {
  metric: string;
  from: string;
  to: string;
  resolution?: TelemetryResolution;
}
