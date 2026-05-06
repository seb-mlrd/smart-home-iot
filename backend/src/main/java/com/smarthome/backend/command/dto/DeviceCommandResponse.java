package com.smarthome.backend.command.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthome.backend.domain.device.DeviceCommandStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DeviceCommandResponse(
        UUID id,
        UUID deviceId,
        UUID userId,
        String command,
        JsonNode payload,
        DeviceCommandStatus status,
        OffsetDateTime sentAt,
        OffsetDateTime ackAt
) {}