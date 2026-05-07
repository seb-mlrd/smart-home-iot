import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DeviceService } from '../../../core/services/device.service';
import { DeviceType } from '../../../core/models/device.model';

@Component({
  selector: 'app-device-add',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatButton, MatAnchor, MatIcon, MatFormField, MatLabel, MatError, MatHint,
    MatInput, MatSelect, MatOption, MatProgressSpinner,
  ],
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--sh-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      margin-bottom: 20px;
      transition: color 0.15s;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: var(--sh-text); }
    }

    .page-header {
      margin-bottom: 28px;
      h1 { margin: 0 0 4px; font-size: 1.6rem; font-weight: 700; color: var(--sh-text); }
      p { margin: 0; color: var(--sh-text-muted); font-size: 0.875rem; }
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 24px;
      align-items: start;

      @media (max-width: 800px) { grid-template-columns: 1fr; }
    }

    .form-card, .info-card {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 12px;
      padding: 24px;
    }

    form { display: flex; flex-direction: column; gap: 18px; }

    .section-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--sh-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: -6px;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px;
      color: var(--sh-offline);
      font-size: 0.875rem;

      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    .actions {
      display: flex;
      gap: 12px;
      padding-top: 4px;
    }

    .submit-btn { flex: 1; height: 44px; font-size: 0.95rem; font-weight: 600; }

    .info-card h3 { margin: 0 0 12px; font-size: 0.9rem; font-weight: 600; color: var(--sh-text); }

    .capability-block { margin-bottom: 16px; }

    .cap-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--sh-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .cap-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .cap-chip {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 0.78rem;
      color: var(--sh-accent);
      font-family: monospace;
    }

    .cmd-chip {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 0.78rem;
      color: var(--sh-online);
      font-family: monospace;
    }

    .no-type-hint {
      color: var(--sh-text-muted);
      font-size: 0.875rem;
      text-align: center;
      padding: 24px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.3; }
    }

    .device-type-meta {
      font-size: 0.8rem;
      color: var(--sh-text-muted);
      margin-bottom: 16px;

      span { display: inline-block; margin-right: 12px; }
    }
  `],
  template: `
    <a class="back-link" routerLink="/devices">
      <mat-icon>arrow_back</mat-icon>
      Retour aux appareils
    </a>

    <div class="page-header">
      <h1>Ajouter un appareil</h1>
      <p>Enregistrez un nouvel appareil IoT sur votre espace</p>
    </div>

    <div class="layout">
      <div class="form-card">
        <form [formGroup]="form" (ngSubmit)="submit()">
          @if (errorMsg()) {
            <div class="error-alert">
              <mat-icon>error_outline</mat-icon>
              {{ errorMsg() }}
            </div>
          }

          <div class="section-title">Type d'appareil</div>

          <mat-form-field appearance="outline">
            <mat-label>Type d'appareil</mat-label>
            <mat-select formControlName="deviceTypeId">
              @if (typesLoading()) {
                <mat-option disabled>Chargement...</mat-option>
              }
              @for (type of deviceTypes(); track type.id) {
                <mat-option [value]="type.id">{{ type.name }}</mat-option>
              }
            </mat-select>
            @if (form.get('deviceTypeId')?.hasError('required') && form.get('deviceTypeId')?.touched) {
              <mat-error>Sélectionnez un type d'appareil</mat-error>
            }
          </mat-form-field>

          <div class="section-title">Informations</div>

          <mat-form-field appearance="outline">
            <mat-label>Nom de l'appareil</mat-label>
            <input matInput formControlName="name" placeholder="Ex: Thermostat salon" />
            <mat-hint>Nom affiché dans votre tableau de bord</mat-hint>
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>Nom requis</mat-error>
            }
            @if (form.get('name')?.hasError('maxlength') && form.get('name')?.touched) {
              <mat-error>150 caractères maximum</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Pièce / Emplacement</mat-label>
            <input matInput formControlName="location" placeholder="Ex: Salon, Cuisine, Chambre..." />
            @if (form.get('location')?.hasError('required') && form.get('location')?.touched) {
              <mat-error>Emplacement requis</mat-error>
            }
          </mat-form-field>

          <div class="actions">
            <a mat-stroked-button routerLink="/devices">Annuler</a>
            <button mat-flat-button class="submit-btn" type="submit" [disabled]="loading()">
              @if (loading()) {
                <mat-progress-spinner diameter="20" mode="indeterminate" />
              } @else {
                Enregistrer l'appareil
              }
            </button>
          </div>
        </form>
      </div>

      <!-- Panneau d'information du type sélectionné -->
      <div class="info-card">
        @if (selectedDeviceType()) {
          <h3>{{ selectedDeviceType()!.name }}</h3>
          <div class="device-type-meta">
            @if (selectedDeviceType()!.manufacturer) {
              <span>{{ selectedDeviceType()!.manufacturer }}</span>
            }
            @if (selectedDeviceType()!.protocol) {
              <span>{{ selectedDeviceType()!.protocol }}</span>
            }
          </div>

          @if (selectedDeviceType()!.capabilities) {
            @if (selectedDeviceType()!.capabilities.telemetry.length) {
              <div class="capability-block">
                <div class="cap-label">Métriques publiées</div>
                <div class="cap-chips">
                  @for (m of selectedDeviceType()!.capabilities.telemetry; track m) {
                    <span class="cap-chip">{{ m }}</span>
                  }
                </div>
              </div>
            }

            @if (selectedDeviceType()!.capabilities.commands.length) {
              <div class="capability-block">
                <div class="cap-label">Commandes disponibles</div>
                <div class="cap-chips">
                  @for (c of selectedDeviceType()!.capabilities.commands; track c) {
                    <span class="cmd-chip">{{ c }}</span>
                  }
                </div>
              </div>
            }
          }
        } @else {
          <div class="no-type-hint">
            <mat-icon>info</mat-icon>
            <span>Sélectionnez un type d'appareil pour voir ses capacités.</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class DeviceAddComponent implements OnInit {
  private readonly deviceSvc = inject(DeviceService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    deviceTypeId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    location: ['', Validators.required],
  });

  deviceTypes = signal<DeviceType[]>([]);
  typesLoading = signal(true);
  loading = signal(false);
  errorMsg = signal('');

  selectedDeviceType = computed(() => {
    const id = this.form.get('deviceTypeId')?.value;
    return id ? (this.deviceTypes().find(t => t.id === id) ?? null) : null;
  });

  ngOnInit() {
    this.deviceSvc.getDeviceTypes().subscribe({
      next: (types) => { this.deviceTypes.set(types); this.typesLoading.set(false); },
      error: () => this.typesLoading.set(false),
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    const { deviceTypeId, name, location } = this.form.value;
    this.deviceSvc.create({
      deviceTypeId: deviceTypeId!,
      name: name!,
      location: location!,
    }).subscribe({
      next: (device) => this.router.navigate(['/devices', device.id]),
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Erreur lors de la création. Réessayez.');
      },
    });
  }
}
