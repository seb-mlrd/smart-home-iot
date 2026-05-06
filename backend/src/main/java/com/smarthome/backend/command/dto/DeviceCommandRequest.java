package com.smarthome.backend.command.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;

public record DeviceCommandRequest(
        @NotBlank String command,
        JsonNode payload
) {}