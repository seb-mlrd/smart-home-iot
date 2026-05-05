import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'sh_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'sh_refresh_token';

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<AuthUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    this.hydrateFromStorage();
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.api.post<void>('/auth/logout', { refreshToken }).subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.api.post<AuthResponse>('/auth/refresh', { refreshToken }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(AuthService.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(AuthService.REFRESH_TOKEN_KEY);
  }

  private handleAuthResponse(response: AuthResponse): void {
    localStorage.setItem(AuthService.ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(AuthService.REFRESH_TOKEN_KEY, response.refreshToken);
    const email = this.decodeEmailFromJwt(response.accessToken);
    this._currentUser.set(email ? { email } : null);
  }

  private hydrateFromStorage(): void {
    const token = this.getAccessToken();
    if (!token) return;
    const email = this.decodeEmailFromJwt(token);
    if (email) this._currentUser.set({ email });
  }

  private clearSession(): void {
    localStorage.removeItem(AuthService.ACCESS_TOKEN_KEY);
    localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
    this._currentUser.set(null);
  }

  private decodeEmailFromJwt(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
