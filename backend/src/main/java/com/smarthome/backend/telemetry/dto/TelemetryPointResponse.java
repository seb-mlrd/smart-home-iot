package com.smarthome.backend.telemetry.dto;

import java.time.OffsetDateTime;

public record TelemetryPointResponse(String metric, double value, String unit, OffsetDateTime time) {}
