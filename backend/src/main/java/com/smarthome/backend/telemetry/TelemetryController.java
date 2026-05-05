package com.smarthome.backend.telemetry;

import com.smarthome.backend.domain.user.User;
import com.smarthome.backend.telemetry.dto.TelemetryHistoryPoint;
import com.smarthome.backend.telemetry.dto.TelemetryPointResponse;
import com.smarthome.backend.telemetry.dto.TelemetryStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/devices/{deviceId}/telemetry")
@RequiredArgsConstructor
public class TelemetryController {

    private final TelemetryService telemetryService;

    @GetMapping("/latest")
    public ResponseEntity<List<TelemetryPointResponse>> getLatest(
            @AuthenticationPrincipal User user,
            @PathVariable UUID deviceId
    ) {
        return ResponseEntity.ok(telemetryService.getLatest(user.getId(), deviceId));
    }

    @GetMapping("/history")
    public ResponseEntity<List<TelemetryHistoryPoint>> getHistory(
            @AuthenticationPrincipal User user,
            @PathVariable UUID deviceId,
            @RequestParam String metric,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(defaultValue = "raw") String resolution
    ) {
        return ResponseEntity.ok(
                telemetryService.getHistory(user.getId(), deviceId, metric, from, to, resolution)
        );
    }

    @GetMapping("/stats")
    public ResponseEntity<TelemetryStatsResponse> getStats(
            @AuthenticationPrincipal User user,
            @PathVariable UUID deviceId,
            @RequestParam String metric,
            @RequestParam(defaultValue = "24h") String period
    ) {
        return ResponseEntity.ok(telemetryService.getStats(user.getId(), deviceId, metric, period));
    }
}
