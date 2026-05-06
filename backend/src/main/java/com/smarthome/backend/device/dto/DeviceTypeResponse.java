package com.smarthome.backend.device.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class DeviceTypeResponse {
    private UUID id;
    private String name;
    private String manufacturer;
    private String protocol;
    @JsonRawValue
    private String capabilities;
    private String icon;
}
