package com.smarthome.backend.device;

import com.smarthome.backend.device.dto.*;
import com.smarthome.backend.domain.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    public ResponseEntity<List<DeviceResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(deviceService.getAll(user.getId()));
    }

    @PostMapping
    public ResponseEntity<DeviceResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DeviceRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.create(user, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviceResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(deviceService.getById(user.getId(), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeviceResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody DeviceUpdateRequest request
    ) {
        return ResponseEntity.ok(deviceService.update(user.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id
    ) {
        deviceService.delete(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(Map.of("status", deviceService.getStatus(user.getId(), id)));
    }
}
