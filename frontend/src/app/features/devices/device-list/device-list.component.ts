import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DeviceService } from '../../../core/services/device.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Device } from '../../../core/models/device.model';
import { DeviceStatusBadgeComponent } from '../../../shared/components/device-status-badge/device-status-badge.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule,
    MatButton, MatAnchor, MatIcon, MatFormField, MatLabel, MatInput, MatSelect, MatOption, MatProgressSpinner,
    DeviceStatusBadgeComponent,
  ],
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;

      h1 { margin: 0; font-size: 1.6rem; font-weight: 700; color: var(--sh-text); }
    }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;

      .search-field { flex: 1; min-width: 200px; }
      .filter-select { width: 160px; }
    }

    .results-count {
      font-size: 0.875rem;
      color: var(--sh-text-muted);
      margin-bottom: 16px;
    }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .device-card {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s, box-shadow 0.15s;

      &:hover { border-color: var(--sh-accent); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    }

    .card-header {
      padding: 18px 18px 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .device-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(59, 130, 246, 0.12);
      color: var(--sh-accent);

      mat-icon { font-size: 22px; width: 22px; height: 22px; }
    }

    .card-body { padding: 14px 18px 18px; flex: 1; }

    .device-name {
      font-size: 1rem;
      font-weight: 600;
      color: var(--sh-text);
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .device-type {
      font-size: 0.8rem;
      color: var(--sh-text-muted);
      margin-bottom: 10px;
    }

    .device-meta {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 0.8rem;
      color: var(--sh-text-muted);

      .meta-item {
        display: flex;
        align-items: center;
        gap: 5px;

        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }
    }

    .card-actions {
      padding: 12px 18px;
      border-top: 1px solid var(--sh-border);
      display: flex;
      gap: 8px;
    }

    .delete-btn {
      color: var(--sh-text-muted);
      min-width: 44px;
      padding: 0 8px;

      &:hover:not(:disabled) { color: var(--sh-offline); border-color: var(--sh-offline); }
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 64px 24px;
      color: var(--sh-text-muted);

      mat-icon { font-size: 56px; width: 56px; height: 56px; opacity: 0.3; display: block; margin: 0 auto 16px; }
      h3 { margin: 0 0 8px; color: var(--sh-text); }
      p { margin: 0 0 24px; font-size: 0.875rem; }
    }

    .center { display: flex; justify-content: center; padding: 80px; }
  `],
  template: `
    <div class="page-header">
      <h1>Appareils</h1>
      <a mat-flat-button routerLink="/devices/add">
        <mat-icon>add</mat-icon>
        Ajouter un appareil
      </a>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Rechercher...</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="searchQuery" placeholder="Nom, pièce..." />
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-select">
        <mat-label>Statut</mat-label>
        <mat-select [(ngModel)]="filterStatus">
          <mat-option value="">Tous</mat-option>
          <mat-option value="ONLINE">En ligne</mat-option>
          <mat-option value="OFFLINE">Hors ligne</mat-option>
          <mat-option value="ERROR">Erreur</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-select">
        <mat-label>Pièce</mat-label>
        <mat-select [(ngModel)]="filterLocation">
          <mat-option value="">Toutes</mat-option>
          @for (loc of locations(); track loc) {
            <mat-option [value]="loc">{{ loc }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="center"><mat-progress-spinner mode="indeterminate" diameter="40" /></div>
    } @else {
      <div class="results-count">{{ filteredDevices().length }} appareil(s) trouvé(s)</div>

      <div class="devices-grid">
        @for (device of filteredDevices(); track device.id) {
          <div class="device-card">
            <div class="card-header">
              <div class="device-icon-wrap">
                <mat-icon>{{ getDeviceIcon(device.deviceTypeName) }}</mat-icon>
              </div>
              <app-device-status-badge [status]="device.status" />
            </div>

            <div class="card-body">
              <div class="device-name" [title]="device.name">{{ device.name }}</div>
              <div class="device-type">{{ device.deviceTypeName }}</div>

              <div class="device-meta">
                <span class="meta-item">
                  <mat-icon>location_on</mat-icon>
                  {{ device.location }}
                </span>
                <span class="meta-item">
                  <mat-icon>tag</mat-icon>
                  {{ device.mqttClientId }}
                </span>
                @if (device.lastSeenAt) {
                  <span class="meta-item">
                    <mat-icon>access_time</mat-icon>
                    Vu {{ formatLastSeen(device.lastSeenAt) }}
                  </span>
                }
              </div>
            </div>

            <div class="card-actions">
              <a mat-stroked-button [routerLink]="['/devices', device.id]" style="flex:1;text-align:center">
                <mat-icon>visibility</mat-icon>
                Voir
              </a>
              <button mat-stroked-button class="delete-btn"
                      (click)="deleteDevice($event, device)"
                      [disabled]="deletingId() === device.id"
                      title="Supprimer">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>devices_other</mat-icon>
            <h3>Aucun appareil trouvé</h3>
            @if (searchQuery || filterStatus || filterLocation) {
              <p>Modifiez vos filtres de recherche.</p>
              <button mat-stroked-button (click)="clearFilters()">Effacer les filtres</button>
            } @else {
              <p>Ajoutez votre premier appareil IoT.</p>
              <a mat-flat-button routerLink="/devices/add">Ajouter un appareil</a>
            }
          </div>
        }
      </div>
    }
  `,
})
export class DeviceListComponent implements OnInit, OnDestroy {
  private readonly deviceSvc = inject(DeviceService);
  private readonly wsSvc = inject(WebSocketService);
  private readonly authSvc = inject(AuthService);
  private readonly subs: Subscription[] = [];

  devices = signal<Device[]>([]);
  loading = signal(true);
  deletingId = signal<string | null>(null);
  searchQuery = '';
  filterStatus = '';
  filterLocation = '';

  locations = computed(() => {
    const locs = this.devices().map(d => d.location).filter(Boolean);
    return [...new Set(locs)].sort();
  });

  filteredDevices = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.devices().filter(d => {
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.location.toLowerCase().includes(q);
      const matchStatus = !this.filterStatus || d.status === this.filterStatus;
      const matchLocation = !this.filterLocation || d.location === this.filterLocation;
      return matchSearch && matchStatus && matchLocation;
    });
  });

  ngOnInit() {
    this.deviceSvc.getAll().subscribe({
      next: (data) => { this.devices.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.wsSvc.connect();
    this.subscribeToStatusUpdates();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private subscribeToStatusUpdates() {
    const userId = this.authSvc.currentUser()?.id;
    if (!userId) return;
    const sub = this.wsSvc.watchStatus(userId).subscribe({
      next: ({ deviceId, status }) => {
        this.devices.update(list =>
          list.map(d => d.id === deviceId ? { ...d, status } : d)
        );
      },
    });
    this.subs.push(sub);
  }

  deleteDevice(event: MouseEvent, device: Device) {
    event.stopPropagation();
    if (!confirm(`Supprimer "${device.name}" ?`)) return;
    this.deletingId.set(device.id);
    this.deviceSvc.delete(device.id).subscribe({
      next: () => {
        this.devices.update(list => list.filter(d => d.id !== device.id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  clearFilters() {
    this.searchQuery = '';
    this.filterStatus = '';
    this.filterLocation = '';
  }

  getDeviceIcon(typeName: string): string {
    const name = typeName?.toLowerCase() ?? '';
    if (name.includes('thermostat')) return 'thermostat';
    if (name.includes('air') || name.includes('co2')) return 'air';
    if (name.includes('prise') || name.includes('plug')) return 'power';
    if (name.includes('motion') || name.includes('mouvement')) return 'sensors';
    if (name.includes('volet') || name.includes('shutter')) return 'blinds';
    if (name.includes('lumi') || name.includes('light')) return 'light_mode';
    return 'device_hub';
  }

  formatLastSeen(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `il y a ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  }
}
