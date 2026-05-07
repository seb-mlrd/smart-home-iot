import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { AuthResponse } from '../models/auth.model';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

const VALID_JWT = makeJwt({ sub: 'test@example.com', userId: 'user-123' });

const MOCK_RESPONSE: AuthResponse = {
  accessToken:  VALID_JWT,
  refreshToken: 'refresh-abc',
  expiresIn:    3600,
};

// ── Setup ──────────────────────────────────────────────────────────────────

function setup(localStorageState: Record<string, string> = {}) {
  localStorage.clear();
  Object.entries(localStorageState).forEach(([k, v]) => localStorage.setItem(k, v));

  const apiSpy    = jasmine.createSpyObj<ApiService>('ApiService', ['post']);
  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

  TestBed.configureTestingModule({
    providers: [
      AuthService,
      { provide: ApiService, useValue: apiSpy },
      { provide: Router,     useValue: routerSpy },
    ],
  });

  return {
    service:   TestBed.inject(AuthService),
    apiSpy,
    routerSpy,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  afterEach(() => localStorage.clear());

  // ── hydrateFromStorage ──────────────────────────────────────────────────

  describe('hydrateFromStorage (constructor)', () => {
    it('should start with null user when localStorage is empty', () => {
      const { service } = setup();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should restore user from a valid token in localStorage', () => {
      const { service } = setup({ sh_access_token: VALID_JWT });

      expect(service.currentUser()).toEqual({ id: 'user-123', email: 'test@example.com' });
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should ignore a malformed token and leave user null', () => {
      const { service } = setup({ sh_access_token: 'not.a.jwt' });

      expect(service.currentUser()).toBeNull();
    });

    it('should ignore a token missing the sub claim', () => {
      const jwtNoSub = makeJwt({ userId: 'user-123' });
      const { service } = setup({ sh_access_token: jwtNoSub });

      expect(service.currentUser()).toBeNull();
    });

    it('should set id to null when userId claim is absent', () => {
      const jwtNoId = makeJwt({ sub: 'test@example.com' });
      const { service } = setup({ sh_access_token: jwtNoId });

      const user = service.currentUser();
      expect(user?.email).toBe('test@example.com');
      expect(user?.id as unknown).toBeNull();
    });
  });

  // ── login ───────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('should call POST /auth/login with credentials', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(of(MOCK_RESPONSE));

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();

      expect(apiSpy.post).toHaveBeenCalledWith('/auth/login', {
        email:    'test@example.com',
        password: 'password',
      });
    });

    it('should save tokens to localStorage on success', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(of(MOCK_RESPONSE));

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();

      expect(localStorage.getItem('sh_access_token')).toBe(VALID_JWT);
      expect(localStorage.getItem('sh_refresh_token')).toBe('refresh-abc');
    });

    it('should set currentUser from the JWT on success', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(of(MOCK_RESPONSE));

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();

      expect(service.currentUser()).toEqual({ id: 'user-123', email: 'test@example.com' });
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should propagate the error and leave user null on failure', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(throwError(() => new Error('401 Unauthorized')));

      let caughtError: unknown;
      service.login({ email: 'bad@test.com', password: 'wrong' }).subscribe({
        error: e => caughtError = e,
      });

      expect(caughtError).toBeTruthy();
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('sh_access_token')).toBeNull();
    });
  });

  // ── register ────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('should call POST /auth/register with the full payload', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(of(MOCK_RESPONSE));
      const req = { email: 'new@test.com', password: 'pw', firstName: 'Alice', lastName: 'B' };

      service.register(req).subscribe();

      expect(apiSpy.post).toHaveBeenCalledWith('/auth/register', req);
    });

    it('should save tokens and set user on success', () => {
      const { service, apiSpy } = setup();
      apiSpy.post.and.returnValue(of(MOCK_RESPONSE));

      service.register({ email: 'new@test.com', password: 'pw', firstName: 'A', lastName: 'B' }).subscribe();

      expect(service.isAuthenticated()).toBeTrue();
      expect(localStorage.getItem('sh_access_token')).toBe(VALID_JWT);
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('should call POST /auth/logout with the refresh token', () => {
      const { service, apiSpy } = setup({
        sh_access_token:  VALID_JWT,
        sh_refresh_token: 'refresh-abc',
      });
      apiSpy.post.and.returnValue(of(void 0));

      service.logout();

      expect(apiSpy.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-abc' });
    });

    it('should clear tokens from localStorage', () => {
      const { service, apiSpy } = setup({
        sh_access_token:  VALID_JWT,
        sh_refresh_token: 'refresh-abc',
      });
      apiSpy.post.and.returnValue(of(void 0));

      service.logout();

      expect(localStorage.getItem('sh_access_token')).toBeNull();
      expect(localStorage.getItem('sh_refresh_token')).toBeNull();
    });

    it('should set currentUser to null', () => {
      const { service, apiSpy } = setup({
        sh_access_token:  VALID_JWT,
        sh_refresh_token: 'refresh-abc',
      });
      apiSpy.post.and.returnValue(of(void 0));

      service.logout();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should redirect to /auth/login', () => {
      const { service, apiSpy, routerSpy } = setup({
        sh_access_token:  VALID_JWT,
        sh_refresh_token: 'refresh-abc',
      });
      apiSpy.post.and.returnValue(of(void 0));

      service.logout();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should not call the API if there is no refresh token', () => {
      const { service, apiSpy } = setup();

      service.logout();

      expect(apiSpy.post).not.toHaveBeenCalled();
    });

    it('should still clear session and redirect if the logout API fails', () => {
      const { service, apiSpy, routerSpy } = setup({
        sh_access_token:  VALID_JWT,
        sh_refresh_token: 'refresh-abc',
      });
      apiSpy.post.and.returnValue(throwError(() => new Error('500')));

      service.logout();

      expect(localStorage.getItem('sh_access_token')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  // ── refreshToken ────────────────────────────────────────────────────────

  describe('refreshToken()', () => {
    it('should call POST /auth/refresh with the stored refresh token', () => {
      const { service, apiSpy } = setup({ sh_refresh_token: 'refresh-abc' });
      apiSpy.post.and.returnValue(of(MOCK_RESPONSE));

      service.refreshToken().subscribe();

      expect(apiSpy.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-abc' });
    });

    it('should update tokens and currentUser on success', () => {
      const { service, apiSpy } = setup({ sh_refresh_token: 'refresh-abc' });
      apiSpy.post.and.returnValue(of(MOCK_RESPONSE));

      service.refreshToken().subscribe();

      expect(localStorage.getItem('sh_access_token')).toBe(VALID_JWT);
      expect(service.currentUser()?.email).toBe('test@example.com');
    });
  });

  // ── getAccessToken / getRefreshToken ────────────────────────────────────

  describe('getAccessToken() / getRefreshToken()', () => {
    it('should return the access token from localStorage', () => {
      const { service } = setup({ sh_access_token: 'mytoken' });
      expect(service.getAccessToken()).toBe('mytoken');
    });

    it('should return null when no access token is stored', () => {
      const { service } = setup();
      expect(service.getAccessToken()).toBeNull();
    });

    it('should return the refresh token from localStorage', () => {
      const { service } = setup({ sh_refresh_token: 'myrefresh' });
      expect(service.getRefreshToken()).toBe('myrefresh');
    });
  });
});
