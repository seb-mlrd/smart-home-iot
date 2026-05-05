package com.smarthome.backend.telemetry.dto;

import java.time.OffsetDateTime;

/**
 * value = instantaneous reading for raw resolution, AVG for aggregated resolutions.
 * min/max are null for raw resolution.
 */
public record TelemetryHistoryPoint(OffsetDateTime time, Double value, String unit, Double min, Double max) {}
