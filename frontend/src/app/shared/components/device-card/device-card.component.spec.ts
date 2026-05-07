import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { DeviceCardComponent } from './device-card.component';
import { Device } from '../../../core/models/device.model';
import { TelemetryPoint } from '../../../core/models/telemetry.model';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
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
    ...overrides,
  };
}

function setup(device: Device, liveMetrics: TelemetryPoint[] = []) {
  TestBed.configureTestingModule({
    imports: [DeviceCardComponent],
    providers: [provideRouter([])],
  });

  const fixture: ComponentFixture<DeviceCardComponent> =
    TestBed.createComponent(DeviceCardComponent);

  fixture.componentRef.setInput('device', device);
  fixture.componentRef.setInput('liveMetrics', liveMetrics);
  fixture.detectChanges();

  return { fixture, component: fixture.componentInstance };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DeviceCardComponent', () => {
  // ── icon() ───────────────────────────────────────────────────────────────

  describe('icon()', () => {
    const cases: [string, string][] = [
      ['Thermostat salon',     'thermostat'],
      ['Capteur air qualité',  'air'],
      ['Capteur CO2',          'air'],
      ['Prise connectée',      'power'],
      ['Smart plug',           'power'],
      ['Détecteur mouvement',  'sensors'],
      ['Motion sensor',        'sensors'],
      ['Volet roulant',        'blinds'],
      ['Shutter controller',   'blinds'],
      ['Ampoule lumière',      'light_mode'],
      ['Smart light',          'light_mode'],
      ['Appareil inconnu',     'device_hub'],
    ];

    cases.forEach(([typeName, expectedIcon]) => {
      it(`should return "${expectedIcon}" for type "${typeName}"`, () => {
        const { component } = setup(makeDevice({ deviceTypeName: typeName }));
        expect(component.icon()).toBe(expectedIcon);
      });
    });

    it('should return "device_hub" when deviceTypeName is empty', () => {
      const { component } = setup(makeDevice({ deviceTypeName: '' }));
      expect(component.icon()).toBe('device_hub');
    });
  });

  // ── lastSeen() ───────────────────────────────────────────────────────────

  describe('lastSeen()', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    function setNow(date: Date) {
      jasmine.clock().mockDate(date);
    }

    it('should return empty string when lastSeenAt is null', () => {
      const { component } = setup(makeDevice({ lastSeenAt: null }));
      expect(component.lastSeen()).toBe('');
    });

    it('should return "à l\'instant" when less than 1 minute ago', () => {
      const now = new Date('2025-06-01T12:00:00Z');
      setNow(now);
      const { component } = setup(makeDevice({ lastSeenAt: '2025-06-01T11:59:30Z' }));
      expect(component.lastSeen()).toBe('à l\'instant');
    });

    it('should return "il y a X min" when less than 1 hour ago', () => {
      const now = new Date('2025-06-01T12:00:00Z');
      setNow(now);
      const { component } = setup(makeDevice({ lastSeenAt: '2025-06-01T11:45:00Z' }));
      expect(component.lastSeen()).toBe('il y a 15 min');
    });

    it('should return "il y a Xh" when less than 24 hours ago', () => {
      const now = new Date('2025-06-01T12:00:00Z');
      setNow(now);
      const { component } = setup(makeDevice({ lastSeenAt: '2025-06-01T09:00:00Z' }));
      expect(component.lastSeen()).toBe('il y a 3h');
    });

    it('should return "il y a Xj" when more than 24 hours ago', () => {
      const now = new Date('2025-06-03T12:00:00Z');
      setNow(now);
      const { component } = setup(makeDevice({ lastSeenAt: '2025-06-01T12:00:00Z' }));
      expect(component.lastSeen()).toBe('il y a 2j');
    });
  });

  // ── Template ─────────────────────────────────────────────────────────────

  describe('template', () => {
    it('should render the device name', () => {
      const { fixture } = setup(makeDevice({ name: 'Mon Thermostat' }));
      const el = fixture.debugElement.query(By.css('.device-name'));
      expect(el.nativeElement.textContent.trim()).toBe('Mon Thermostat');
    });

    it('should render the device location', () => {
      const { fixture } = setup(makeDevice({ location: 'Chambre' }));
      const el = fixture.debugElement.query(By.css('.device-location'));
      expect(el.nativeElement.textContent).toContain('Chambre');
    });

    it('should link to the device detail page', () => {
      const { fixture } = setup(makeDevice({ id: 'dev-42' }));
      const link = fixture.debugElement.query(By.css('a.card'));
      expect(link.attributes['ng-reflect-router-link']).toContain('dev-42');
    });

    it('should not render the metrics section when liveMetrics is empty', () => {
      const { fixture } = setup(makeDevice(), []);
      const metrics = fixture.debugElement.query(By.css('.metrics'));
      expect(metrics).toBeNull();
    });

    it('should render up to 3 metric chips', () => {
      const metrics: TelemetryPoint[] = [
        { metric: 'temperature', value: 21.5, unit: '°C', time: '' },
        { metric: 'humidity',    value: 55,   unit: '%',  time: '' },
        { metric: 'co2',         value: 450,  unit: 'ppm', time: '' },
        { metric: 'pressure',    value: 1013, unit: 'hPa', time: '' },
      ];
      const { fixture } = setup(makeDevice(), metrics);
      const chips = fixture.debugElement.queryAll(By.css('.metric-chip'));
      expect(chips.length).toBe(3);
    });

    it('should not render last-seen when lastSeenAt is null', () => {
      const { fixture } = setup(makeDevice({ lastSeenAt: null }));
      const el = fixture.debugElement.query(By.css('.last-seen'));
      expect(el).toBeNull();
    });

    it('should render last-seen when lastSeenAt is set', () => {
      const { fixture } = setup(makeDevice({ lastSeenAt: '2025-06-01T12:00:00Z' }));
      const el = fixture.debugElement.query(By.css('.last-seen'));
      expect(el).not.toBeNull();
    });
  });
});
