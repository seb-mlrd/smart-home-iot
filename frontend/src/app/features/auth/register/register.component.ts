import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormField, MatLabel, MatError, MatInput, MatButton, MatIcon, MatProgressSpinner,
  ],
  styles: [`
    .auth-page {
      min-height: 100vh;
      background: var(--sh-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .auth-box {
      width: 100%;
      max-width: 440px;
    }

    .brand {
      text-align: center;
      margin-bottom: 32px;

      .brand-icon {
        width: 52px;
        height: 52px;
        background: var(--sh-accent);
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;

        mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
      }

      h1 { margin: 0 0 6px; font-size: 1.5rem; font-weight: 700; color: var(--sh-text); }
      p { margin: 0; color: var(--sh-text-muted); font-size: 0.875rem; }
    }

    .card {
      background: var(--sh-bg-card);
      border: 1px solid var(--sh-border);
      border-radius: 16px;
      padding: 32px;
    }

    form { display: flex; flex-direction: column; gap: 16px; }

    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

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

    .submit-btn {
      width: 100%;
      height: 44px;
      font-size: 0.95rem;
      font-weight: 600;
      margin-top: 4px;
    }

    .footer-link {
      text-align: center;
      margin-top: 20px;
      font-size: 0.875rem;
      color: var(--sh-text-muted);

      a { color: var(--sh-accent); text-decoration: none; font-weight: 500; &:hover { text-decoration: underline; } }
    }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-box">
        <div class="brand">
          <div class="brand-icon"><mat-icon>home</mat-icon></div>
          <h1>Créer un compte</h1>
          <p>Commencez à gérer vos appareils IoT</p>
        </div>

        <div class="card">
          <form [formGroup]="form" (ngSubmit)="submit()">
            @if (errorMsg()) {
              <div class="error-alert">
                <mat-icon>error_outline</mat-icon>
                {{ errorMsg() }}
              </div>
            }

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Prénom</mat-label>
                <input matInput formControlName="firstName" />
                @if (form.get('firstName')?.hasError('required') && form.get('firstName')?.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="lastName" />
                @if (form.get('lastName')?.hasError('required') && form.get('lastName')?.touched) {
                  <mat-error>Requis</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email" />
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error>Email requis</mat-error>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <mat-error>Email invalide</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Mot de passe</mat-label>
              <input matInput formControlName="password" type="password" autocomplete="new-password" />
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error>Mot de passe requis</mat-error>
              }
              @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                <mat-error>Minimum 8 caractères</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button class="submit-btn" type="submit" [disabled]="loading()">
              @if (loading()) {
                <mat-progress-spinner diameter="20" mode="indeterminate" />
              } @else {
                Créer le compte
              }
            </button>
          </form>
        </div>

        <div class="footer-link">
          Déjà un compte ? <a routerLink="/auth/login">Se connecter</a>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = signal(false);
  errorMsg = signal('');

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    const { email, password, firstName, lastName } = this.form.value;
    this.auth.register({ email: email!, password: password!, firstName: firstName!, lastName: lastName! }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.errorMsg.set('Cet email est déjà utilisé.');
        } else {
          this.errorMsg.set('Une erreur est survenue. Réessayez.');
        }
      },
    });
  }
}
