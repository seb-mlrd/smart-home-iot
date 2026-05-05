package com.smarthome.backend.mqtt.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.OffsetDateTime;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelemetryPayload(String deviceId, OffsetDateTime timestamp, List<MetricItem> metrics) {}
