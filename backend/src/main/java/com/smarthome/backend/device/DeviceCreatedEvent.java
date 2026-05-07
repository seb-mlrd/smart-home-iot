package com.smarthome.backend.device;

import java.util.UUID;

public record DeviceCreatedEvent(UUID deviceId, UUID userId, String deviceTypeName, int intervalMs) {}
