import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIcon],
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--sh-bg);
    }

    .sidebar {
      width: var(--sh-sidebar-width);
      flex-shrink: 0;
      background: #0b1120;
      border-right: 1px solid var(--sh-border);
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--sh-border);

      .brand-icon {
        width: 36px;
        height: 36px;
        background: var(--sh-accent);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          color: white;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .brand-name {
        font-size: 1rem;
        font-weight: 700;
        color: var(--sh-text);
        letter-spacing: -0.01em;
      }
    }

    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--sh-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      &:hover {
        background: rgba(255,255,255,0.06);
        color: var(--sh-text);
      }

      &.active {
        background: rgba(59, 130, 246, 0.15);
        color: var(--sh-accent);
      }
    }

    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid var(--sh-border);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;

      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--sh-accent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }

      .user-email {
        flex: 1;
        font-size: 0.8rem;
        color: var(--sh-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      color: var(--sh-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      transition: background 0.15s, color 0.15s;

      mat-icon { font-size: 20px; width: 20px; height: 20px; }

      &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--sh-offline);
      }
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      height: 56px;
      flex-shrink: 0;
      background: #0b1120;
      border-bottom: 1px solid var(--sh-border);
      display: flex;
      align-items: center;
      padding: 0 24px;
      justify-content: flex-end;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
  `],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon"><mat-icon>home</mat-icon></div>
          <span class="brand-name">SmartHome</span>
        </div>

        <nav class="sidebar-nav">
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
            <mat-icon>dashboard</mat-icon>
            Dashboard
          </a>
          <a class="nav-item" routerLink="/devices" routerLinkActive="active">
            <mat-icon>devices</mat-icon>
            Appareils
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">{{ userInitial() }}</div>
            <span class="user-email">{{ userEmail() }}</span>
          </div>
          <button class="logout-btn" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Déconnexion
          </button>
        </div>
      </aside>

      <div class="main">
        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);

  userEmail() {
    return this.auth.currentUser()?.email ?? '';
  }

  userInitial() {
    const email = this.userEmail();
    return email ? email[0].toUpperCase() : '?';
  }

  logout() {
    this.auth.logout();
  }
}
