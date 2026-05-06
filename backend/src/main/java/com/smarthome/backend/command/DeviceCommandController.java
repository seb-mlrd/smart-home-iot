package com.smarthome.backend.command;

import com.smarthome.backend.command.dto.DeviceCommandRequest;
import com.smarthome.backend.command.dto.DeviceCommandResponse;
import com.smarthome.backend.domain.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/devices/{deviceId}/commands")
@RequiredArgsConstructor
public class DeviceCommandController {

    private final DeviceCommandService deviceCommandService;

    @PostMapping
    public ResponseEntity<DeviceCommandResponse> sendCommand(
            @AuthenticationPrincipal User user,
            @PathVariable UUID deviceId,
            @Valid @RequestBody DeviceCommandRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceCommandService.send(user.getId(), deviceId, request));
    }

    @GetMapping
    public ResponseEntity<List<DeviceCommandResponse>> listCommands(
            @AuthenticationPrincipal User user,
            @PathVariable UUID deviceId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(deviceCommandService.list(user.getId(), deviceId, limit));
    }
}