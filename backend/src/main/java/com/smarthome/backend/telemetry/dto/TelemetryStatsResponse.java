package com.smarthome.backend.telemetry.dto;

import java.time.OffsetDateTime;

public record TelemetryStatsResponse(
        String metric,
        Double min,
        Double max,
        Double avg,
        Double last,
        long count,
        OffsetDateTime from,
        OffsetDateTime to
) {}
