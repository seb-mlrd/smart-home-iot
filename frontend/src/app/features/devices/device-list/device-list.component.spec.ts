import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, Subject } from 'rxjs';

import { DeviceListComponent } from './device-list.component';
import { DeviceService } from '../../../core/services/device.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Device, DeviceStatus } from '../../../core/models/device.model';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'dev-1',
    deviceTypeId: 'type-1',
    deviceTypeName: 'Thermostat',
    name: 'Thermostat Salon',
    location: 'Salon',
    mqttClientId: 'thermo-01',
    status: 'ONLINE',
    config: null,
    lastSeenAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const DEVICES: Device[] = [
  makeDevice({ id: '1', name: 'Thermostat Salon',  location: 'Salon',   status: 'ONLINE'  }),
  makeDevice({ id: '2', name: 'Capteur Chambre',   location: 'Chambre', status: 'OFFLINE', deviceTypeName: 'Capteur CO2' }),
  makeDevice({ id: '3', name: 'Prise Cuisine',     location: 'Cuisine', status: 'ERROR',   deviceTypeName: 'Prise connectée' }),
];

// ── Setup ───────────────────────────────────────────────────────────────────

function setup(devices = DEVICES) {
  const statusSubject = new Subject<{ deviceId: string; status: DeviceStatus }>();

  const deviceSpy = jasmine.createSpyObj<DeviceService>('DeviceService', ['getAll']);
  const wsSpy     = jasmine.createSpyObj<WebSocketService>('WebSocketService', ['connect', 'watchStatus']);
  const authSpy   = jasmine.createSpyObj<AuthService>('AuthService', ['currentUser']);

  deviceSpy.getAll.and.returnValue(of(devices));
  wsSpy.watchStatus.and.returnValue(statusSubject.asObservable());
  authSpy.currentUser.and.returnValue({ id: 'user-1', email: 'test@test.com' });

  TestBed.configureTestingModule({
    imports: [DeviceListComponent],
    providers: [
      { provide: DeviceService,   useValue: deviceSpy },
      { provide: WebSocketService, useValue: wsSpy },
      { provide: AuthService,     useValue: authSpy },
      provideRouter([]),
      provideAnimationsAsync(),
    ],
  });

  const fixture = TestBed.createComponent(DeviceListComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component, statusSubject };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DeviceListComponent', () => {
  // ── filteredDevices ──────────────────────────────────────────────────────
  // searchQuery / filterStatus / filterLocation sont des strings ordinaires
  // (pas des signaux), donc le computed ne les track pas. Pour forcer la
  // réévaluation dans les tests, on met à jour le signal devices après avoir
  // modifié les filtres.

  function applyFilter(component: DeviceListComponent) {
    component.devices.set([...component.devices()]);
  }

  describe('filteredDevices()', () => {
    it('should return all devices when no filter is set', () => {
      const { component } = setup();
      expect(component.filteredDevices().length).toBe(3);
    });

    it('should filter by name (case-insensitive)', () => {
      const { component } = setup();
      component.searchQuery = 'thermostat';
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(1);
      expect(component.filteredDevices()[0].name).toBe('Thermostat Salon');
    });

    it('should filter by location via searchQuery', () => {
      const { component } = setup();
      component.searchQuery = 'chambre';
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(1);
      expect(component.filteredDevices()[0].location).toBe('Chambre');
    });

    it('should filter by status', () => {
      const { component } = setup();
      component.filterStatus = 'ONLINE';
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(1);
      expect(component.filteredDevices()[0].status).toBe('ONLINE');
    });

    it('should filter by location dropdown', () => {
      const { component } = setup();
      component.filterLocation = 'Cuisine';
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(1);
      expect(component.filteredDevices()[0].location).toBe('Cuisine');
    });

    it('should combine search and status filters', () => {
      const { component } = setup();
      component.searchQuery = 'salon';
      component.filterStatus = 'ONLINE';
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(1);
    });

    it('should return empty array when no device matches', () => {
      const { component } = setup();
      component.searchQuery = 'inexistant';
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(0);
    });

    it('should return empty array when no devices are loaded', () => {
      const { component } = setup([]);
      expect(component.filteredDevices().length).toBe(0);
    });
  });

  // ── locations ────────────────────────────────────────────────────────────

  describe('locations()', () => {
    it('should return unique sorted locations', () => {
      const { component } = setup();
      expect(component.locations()).toEqual(['Chambre', 'Cuisine', 'Salon']);
    });

    it('should return empty array when no devices', () => {
      const { component } = setup([]);
      expect(component.locations()).toEqual([]);
    });

    it('should deduplicate locations', () => {
      const devices = [
        makeDevice({ id: '1', location: 'Salon' }),
        makeDevice({ id: '2', location: 'Salon' }),
        makeDevice({ id: '3', location: 'Chambre' }),
      ];
      const { component } = setup(devices);
      expect(component.locations()).toEqual(['Chambre', 'Salon']);
    });
  });

  // ── clearFilters ─────────────────────────────────────────────────────────

  describe('clearFilters()', () => {
    it('should reset all filter properties', () => {
      const { component } = setup();
      component.searchQuery   = 'thermostat';
      component.filterStatus  = 'ONLINE';
      component.filterLocation = 'Salon';

      component.clearFilters();

      expect(component.searchQuery).toBe('');
      expect(component.filterStatus).toBe('');
      expect(component.filterLocation).toBe('');
    });

    it('should restore all devices after clearing filters', () => {
      const { component } = setup();
      component.filterStatus = 'ONLINE';
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(1);

      component.clearFilters();
      applyFilter(component);
      expect(component.filteredDevices().length).toBe(3);
    });
  });

  // ── getDeviceIcon ─────────────────────────────────────────────────────────

  describe('getDeviceIcon()', () => {
    const cases: [string, string][] = [
      ['Thermostat salon',    'thermostat'],
      ['Capteur air qualité', 'air'],
      ['Capteur CO2',         'air'],
      ['Prise connectée',     'power'],
      ['Smart plug',          'power'],
      ['Détecteur mouvement', 'sensors'],
      ['Motion sensor',       'sensors'],
      ['Volet roulant',       'blinds'],
      ['Shutter controller',  'blinds'],
      ['Lumière connectée',   'light_mode'],
      ['Smart light',         'light_mode'],
      ['Appareil inconnu',    'device_hub'],
      ['',                    'device_hub'],
    ];

    cases.forEach(([typeName, expectedIcon]) => {
      it(`should return "${expectedIcon}" for "${typeName}"`, () => {
        const { component } = setup([]);
        expect(component.getDeviceIcon(typeName)).toBe(expectedIcon);
      });
    });
  });

  // ── formatLastSeen ────────────────────────────────────────────────────────

  describe('formatLastSeen()', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    function setNow(date: Date) { jasmine.clock().mockDate(date); }

    it('should return "à l\'instant" for less than 1 minute', () => {
      setNow(new Date('2025-06-01T12:00:00Z'));
      const { component } = setup([]);
      expect(component.formatLastSeen('2025-06-01T11:59:45Z')).toBe('à l\'instant');
    });

    it('should return "il y a X min" for less than 1 hour', () => {
      setNow(new Date('2025-06-01T12:00:00Z'));
      const { component } = setup([]);
      expect(component.formatLastSeen('2025-06-01T11:30:00Z')).toBe('il y a 30 min');
    });

    it('should return "il y a Xh" for less than 24 hours', () => {
      setNow(new Date('2025-06-01T12:00:00Z'));
      const { component } = setup([]);
      expect(component.formatLastSeen('2025-06-01T06:00:00Z')).toBe('il y a 6h');
    });

    it('should return "il y a Xj" for more than 24 hours', () => {
      setNow(new Date('2025-06-04T12:00:00Z'));
      const { component } = setup([]);
      expect(component.formatLastSeen('2025-06-01T12:00:00Z')).toBe('il y a 3j');
    });
  });

  // ── WebSocket status updates ──────────────────────────────────────────────

  describe('WebSocket status updates', () => {
    it('should update device status when a WS message arrives', () => {
      const { component, statusSubject } = setup();
      expect(component.devices().find(d => d.id === '1')?.status).toBe('ONLINE');

      statusSubject.next({ deviceId: '1', status: 'OFFLINE' });

      expect(component.devices().find(d => d.id === '1')?.status).toBe('OFFLINE');
    });

    it('should not affect other devices when one status changes', () => {
      const { component, statusSubject } = setup();
      statusSubject.next({ deviceId: '1', status: 'ERROR' });

      expect(component.devices().find(d => d.id === '2')?.status).toBe('OFFLINE');
      expect(component.devices().find(d => d.id === '3')?.status).toBe('ERROR');
    });
  });
});
