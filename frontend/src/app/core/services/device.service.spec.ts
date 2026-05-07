import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DeviceService } from './device.service';
import { ApiService } from './api.service';
import { Device, DeviceCommand, DeviceRequest, DeviceType, SendCommandRequest } from '../models/device.model';

// ── Fixtures ────────────────────────────────────────────────────────────────

const DEVICE: Device = {
  id: 'dev-1',
  deviceTypeId: 'type-1',
  deviceTypeName: 'Thermostat',
  name: 'Salon',
  location: 'Salon',
  mqttClientId: 'thermo-01',
  status: 'ONLINE',
  config: null,
  lastSeenAt: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const COMMAND: DeviceCommand = {
  id: 'cmd-1',
  deviceId: 'dev-1',
  command: 'SET_TEMPERATURE',
  payload: { value: 21 },
  status: 'SENT',
  sentAt: '2025-01-01T00:00:00Z',
  ackAt: null,
};

const DEVICE_TYPE: DeviceType = {
  id: 'type-1',
  name: 'Thermostat',
  manufacturer: 'Acme',
  protocol: 'MQTT',
  capabilities: { telemetry: ['temperature'], commands: ['SET_TEMPERATURE'] },
  icon: 'thermostat',
  createdAt: '2025-01-01T00:00:00Z',
};

// ── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  const apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put', 'delete']);

  TestBed.configureTestingModule({
    providers: [
      DeviceService,
      { provide: ApiService, useValue: apiSpy },
    ],
  });

  return { service: TestBed.inject(DeviceService), apiSpy };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DeviceService', () => {
  // ── getAll ──────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('should call GET /devices', () => {
      const { service, apiSpy } = setup();
      apiSpy.get.and.returnValue(of([DEVICE]));

      let result: Device[] = [];
      service.getAll().subscribe(d => result = d);

      expect(apiSpy.get).toHaveBeenCalledWith('/devices');
      expect(result).toEqual([DEVICE]);
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('should call GET /devices/:id', () => {
      const { service, apiSpy } = setup();
      apiSpy.get.and.returnValue(of(DEVICE));

      let result: Device | undefined;
      service.getById('dev-1').subscribe(d => result = d);

      expect(apiSpy.get).toHaveBeenCalledWith('/devices/dev-1');
      expect(result).toEqual(DEVICE);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should call POST /devices with the request body', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(of(DEVICE));
      const req: DeviceRequest = {
        deviceTypeId: 'type-1',
        name: 'Salon',
        location: 'Salon',
        mqttClientId: 'thermo-01',
      };

      let result: Device | undefined;
      service.create(req).subscribe(d => result = d);

      expect(apiSpy.post).toHaveBeenCalledWith('/devices', req);
      expect(result).toEqual(DEVICE);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should call PUT /devices/:id with the update body', () => {
      const { service, apiSpy } = setup();
      apiSpy.put.and.returnValue(of(DEVICE));
      const req = { name: 'Chambre', location: 'Chambre' };

      service.update('dev-1', req).subscribe();

      expect(apiSpy.put).toHaveBeenCalledWith('/devices/dev-1', req);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should call DELETE /devices/:id', () => {
      const { service, apiSpy } = setup();
      apiSpy.delete.and.returnValue(of(void 0));

      service.delete('dev-1').subscribe();

      expect(apiSpy.delete).toHaveBeenCalledWith('/devices/dev-1');
    });
  });

  // ── getStatus ───────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('should call GET /devices/:id/status', () => {
      const { service, apiSpy } = setup();
      apiSpy.get.and.returnValue(of({ status: 'ONLINE' }));

      let result: { status: string } | undefined;
      service.getStatus('dev-1').subscribe(s => result = s);

      expect(apiSpy.get).toHaveBeenCalledWith('/devices/dev-1/status');
      expect(result).toEqual({ status: 'ONLINE' });
    });
  });

  // ── sendCommand ─────────────────────────────────────────────────────────

  describe('sendCommand()', () => {
    it('should call POST /devices/:id/commands', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(of(COMMAND));
      const req: SendCommandRequest = { command: 'SET_TEMPERATURE', payload: { value: 21 } };

      let result: DeviceCommand | undefined;
      service.sendCommand('dev-1', req).subscribe(c => result = c);

      expect(apiSpy.post).toHaveBeenCalledWith('/devices/dev-1/commands', req);
      expect(result).toEqual(COMMAND);
    });
  });

  // ── getCommands ─────────────────────────────────────────────────────────

  describe('getCommands()', () => {
    it('should call GET /devices/:id/commands with default limit 20', () => {
      const { service, apiSpy } = setup();
      apiSpy.get.and.returnValue(of([COMMAND]));

      service.getCommands('dev-1').subscribe();

      expect(apiSpy.get).toHaveBeenCalledWith('/devices/dev-1/commands', { limit: '20' });
    });

    it('should pass a custom limit', () => {
      const { service, apiSpy } = setup();
      apiSpy.get.and.returnValue(of([]));

      service.getCommands('dev-1', 5).subscribe();

      expect(apiSpy.get).toHaveBeenCalledWith('/devices/dev-1/commands', { limit: '5' });
    });
  });

  // ── getDeviceTypes ───────────────────────────────────────────────────────

  describe('getDeviceTypes()', () => {
    it('should call GET /device-types', () => {
      const { service, apiSpy } = setup();
      apiSpy.get.and.returnValue(of([DEVICE_TYPE]));

      let result: DeviceType[] = [];
      service.getDeviceTypes().subscribe(t => result = t);

      expect(apiSpy.get).toHaveBeenCalledWith('/device-types');
      expect(result).toEqual([DEVICE_TYPE]);
    });
  });
});
