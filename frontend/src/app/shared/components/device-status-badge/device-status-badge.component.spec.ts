import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DeviceStatusBadgeComponent } from './device-status-badge.component';
import { DeviceStatus } from '../../../core/models/device.model';

function setup(status: DeviceStatus) {
  TestBed.configureTestingModule({
    imports: [DeviceStatusBadgeComponent],
  });

  const fixture: ComponentFixture<DeviceStatusBadgeComponent> =
    TestBed.createComponent(DeviceStatusBadgeComponent);

  fixture.componentRef.setInput('status', status);
  fixture.detectChanges();

  const badge = fixture.debugElement.query(By.css('.badge'));
  return { fixture, badge };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DeviceStatusBadgeComponent', () => {
  // ── Label ───────────────────────────────────────────────────────────────

  describe('label()', () => {
    it('should display "En ligne" for ONLINE', () => {
      const { badge } = setup('ONLINE');
      expect(badge.nativeElement.textContent.trim()).toBe('En ligne');
    });

    it('should display "Hors ligne" for OFFLINE', () => {
      const { badge } = setup('OFFLINE');
      expect(badge.nativeElement.textContent.trim()).toBe('Hors ligne');
    });

    it('should display "Erreur" for ERROR', () => {
      const { badge } = setup('ERROR');
      expect(badge.nativeElement.textContent.trim()).toBe('Erreur');
    });
  });

  // ── CSS class ────────────────────────────────────────────────────────────

  describe('CSS class', () => {
    it('should have class "online" for ONLINE', () => {
      const { badge } = setup('ONLINE');
      expect(badge.nativeElement.classList).toContain('online');
    });

    it('should have class "offline" for OFFLINE', () => {
      const { badge } = setup('OFFLINE');
      expect(badge.nativeElement.classList).toContain('offline');
    });

    it('should have class "error" for ERROR', () => {
      const { badge } = setup('ERROR');
      expect(badge.nativeElement.classList).toContain('error');
    });
  });

  // ── Reactivity ───────────────────────────────────────────────────────────

  describe('reactivity', () => {
    it('should update label and class when status input changes', () => {
      TestBed.configureTestingModule({ imports: [DeviceStatusBadgeComponent] });
      const fixture = TestBed.createComponent(DeviceStatusBadgeComponent);

      fixture.componentRef.setInput('status', 'ONLINE');
      fixture.detectChanges();
      const badge = fixture.debugElement.query(By.css('.badge'));
      expect(badge.nativeElement.textContent.trim()).toBe('En ligne');
      expect(badge.nativeElement.classList).toContain('online');

      fixture.componentRef.setInput('status', 'OFFLINE');
      fixture.detectChanges();
      expect(badge.nativeElement.textContent.trim()).toBe('Hors ligne');
      expect(badge.nativeElement.classList).toContain('offline');
    });
  });
});
