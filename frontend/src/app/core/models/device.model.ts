export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';

export interface DeviceCapabilities {
  telemetry: string[];
  commands: string[];
}

export interface DeviceType {
  id: string;
  name: string;
  manufacturer: string;
  protocol: string;
  capabilities: DeviceCapabilities;
  icon: string;
  createdAt: string;
}

export interface Device {
  id: string;
  deviceTypeId: string;
  deviceTypeName: string;
  name: string;
  location: string;
  mqttClientId: string;
  status: DeviceStatus;
  config: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceRequest {
  deviceTypeId: string;
  name: string;
  location: string;
  config?: string;
}

export interface DeviceUpdateRequest {
  name: string;
  location: string;
  config?: string;
}

export interface DeviceCommand {
  id: string;
  deviceId: string;
  command: string;
  payload: Record<string, unknown>;
  status: 'SENT' | 'ACK' | 'ERROR';
  sentAt: string;
  ackAt: string | null;
}

export interface SendCommandRequest {
  command: string;
  payload?: Record<string, unknown>;
}
