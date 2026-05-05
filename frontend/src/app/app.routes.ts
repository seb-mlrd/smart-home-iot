import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'devices',
        loadComponent: () =>
          import('./features/devices/device-list/device-list.component').then(m => m.DeviceListComponent),
      },
      {
        path: 'devices/add',
        loadComponent: () =>
          import('./features/devices/device-add/device-add.component').then(m => m.DeviceAddComponent),
      },
      {
        path: 'devices/:id',
        loadComponent: () =>
          import('./features/devices/device-detail/device-detail.component').then(m => m.DeviceDetailComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
