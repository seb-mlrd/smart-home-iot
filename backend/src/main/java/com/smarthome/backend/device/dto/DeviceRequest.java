package com.smarthome.backend.device.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record DeviceRequest(
        @NotNull UUID deviceTypeId,
        @NotBlank String name,
        String location,
        String mqttClientId,
        String config
) {}
