package com.smarthome.backend.mqtt.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MetricItem(String name, Double value, String unit) {}
