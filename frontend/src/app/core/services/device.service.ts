import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Device, DeviceCommand, DeviceRequest, DeviceType, DeviceUpdateRequest, SendCommandRequest } from '../models/device.model';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Device[]> {
    return this.api.get<Device[]>('/devices');
  }

  getById(id: string): Observable<Device> {
    return this.api.get<Device>(`/devices/${id}`);
  }

  create(request: DeviceRequest): Observable<Device> {
    return this.api.post<Device>('/devices', request);
  }

  update(id: string, request: DeviceUpdateRequest): Observable<Device> {
    return this.api.put<Device>(`/devices/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/devices/${id}`);
  }

  getStatus(id: string): Observable<{ status: string }> {
    return this.api.get<{ status: string }>(`/devices/${id}/status`);
  }

  sendCommand(deviceId: string, request: SendCommandRequest): Observable<DeviceCommand> {
    return this.api.post<DeviceCommand>(`/devices/${deviceId}/commands`, request);
  }

  getCommands(deviceId: string, limit = 20): Observable<DeviceCommand[]> {
    return this.api.get<DeviceCommand[]>(`/devices/${deviceId}/commands`, { limit: String(limit) });
  }

  getDeviceTypes(): Observable<DeviceType[]> {
    return this.api.get<DeviceType[]>('/device-types');
  }
}
