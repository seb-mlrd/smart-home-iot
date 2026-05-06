import { inject, Injectable, OnDestroy } from '@angular/core';
import { RxStomp, RxStompConfig } from '@stomp/rx-stomp';
import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TelemetryPoint } from '../models/telemetry.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly stomp = new RxStomp();

  connect(): void {
    const token = this.auth.getAccessToken();
    if (!token) return;

    const config: RxStompConfig = {
      brokerURL: `${environment.wsUrl}?token=${token}`,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    };
    this.stomp.configure(config);
    this.stomp.activate();
  }

  disconnect(): void {
    this.stomp.deactivate();
  }

  /** Subscribe to live telemetry for a specific device. */
  watchDevice(userId: string, deviceId: string): Observable<TelemetryPoint[]> {
    if (!this.stomp.active) return EMPTY;
    return this.stomp
      .watch(`/topic/devices/${userId}/${deviceId}/telemetry`)
      .pipe(map(frame => JSON.parse(frame.body) as TelemetryPoint[]));
  }

  ngOnDestroy(): void {
    this.stomp.deactivate();
  }
}
