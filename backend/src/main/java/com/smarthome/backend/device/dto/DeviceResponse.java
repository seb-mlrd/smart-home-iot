package com.smarthome.backend.device.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class DeviceResponse {
    private UUID id;
    private UUID deviceTypeId;
    private String deviceTypeName;
    private String name;
    private String location;
    private String mqttClientId;
    private String status;
    @JsonRawValue
    private String config;
    private OffsetDateTime lastSeenAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
