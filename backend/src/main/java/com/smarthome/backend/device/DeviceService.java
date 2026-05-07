package com.smarthome.backend.device;

import com.smarthome.backend.device.dto.*;
import com.smarthome.backend.domain.device.*;
import com.smarthome.backend.domain.user.User;
import com.smarthome.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceService {

    // Maps fixed device-type UUIDs (Liquibase 002 + 006) → simulator type keys
    private static final Map<UUID, String> SIMULATOR_TYPE = Map.of(
            UUID.fromString("11111111-0000-0000-0000-000000000001"), "thermostat",
            UUID.fromString("11111111-0000-0000-0000-000000000002"), "co2_sensor",
            UUID.fromString("11111111-0000-0000-0000-000000000003"), "smart_plug",
            UUID.fromString("11111111-0000-0000-0000-000000000004"), "motion_detector",
            UUID.fromString("11111111-0000-0000-0000-000000000005"), "temperature_sensor",
            UUID.fromString("11111111-0000-0000-0000-000000000006"), "lux_sensor",
            UUID.fromString("11111111-0000-0000-0000-000000000007"), "light_actuator",
            UUID.fromString("11111111-0000-0000-0000-000000000008"), "shutter_actuator"
    );

    private final DeviceRepository deviceRepository;
    private final DeviceTypeRepository deviceTypeRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<DeviceResponse> getAll(UUID userId) {
        return deviceRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DeviceResponse create(User user, DeviceRequest request) {
        DeviceType deviceType = deviceTypeRepository.findById(request.deviceTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Device type not found: " + request.deviceTypeId()));
        Device device = Device.builder()
                .user(user)
                .deviceType(deviceType)
                .name(request.name())
                .location(request.location())
                .mqttClientId(request.mqttClientId())
                .config(request.config())
                .status(DeviceStatus.OFFLINE)
                .build();
        Device saved = deviceRepository.save(device);
        saved.setMqttClientId("sim-" + user.getId() + "-" + saved.getId());
        saved = deviceRepository.save(saved);
        String simType = SIMULATOR_TYPE.getOrDefault(deviceType.getId(), "unknown");
        eventPublisher.publishEvent(new DeviceCreatedEvent(
                saved.getId(), user.getId(), simType, defaultIntervalMs(simType)
        ));
        return toResponse(saved);
    }

    private int defaultIntervalMs(String typeName) {
        return switch (typeName.toLowerCase()) {
            case "lux_sensor" -> 3000;
            case "light_actuator", "shutter_actuator", "motion_detector" -> 2000;
            case "co2_sensor" -> 10000;
            default -> 5000;
        };
    }

    @Transactional(readOnly = true)
    public DeviceResponse getById(UUID userId, UUID deviceId) {
        return toResponse(findOwned(userId, deviceId));
    }

    @Transactional
    public DeviceResponse update(UUID userId, UUID deviceId, DeviceUpdateRequest request) {
        Device device = findOwned(userId, deviceId);
        device.setName(request.name());
        device.setLocation(request.location());
        device.setConfig(request.config());
        return toResponse(deviceRepository.save(device));
    }

    @Transactional
    public void delete(UUID userId, UUID deviceId) {
        deviceRepository.delete(findOwned(userId, deviceId));
    }

    @Transactional(readOnly = true)
    public String getStatus(UUID userId, UUID deviceId) {
        return findOwned(userId, deviceId).getStatus().name();
    }

    @Transactional
    public void updateDeviceOnline(UUID deviceId) {
        deviceRepository.findById(deviceId).ifPresent(device -> {
            device.setStatus(DeviceStatus.ONLINE);
            device.setLastSeenAt(OffsetDateTime.now());
            deviceRepository.save(device);
            broadcastStatus(device.getUser().getId(), deviceId, "ONLINE");
        });
    }

    @Transactional
    public void updateDeviceOffline(UUID deviceId) {
        deviceRepository.findById(deviceId).ifPresent(device -> {
            device.setStatus(DeviceStatus.OFFLINE);
            deviceRepository.save(device);
            broadcastStatus(device.getUser().getId(), deviceId, "OFFLINE");
        });
    }

    private void broadcastStatus(UUID userId, UUID deviceId, String status) {
        messagingTemplate.convertAndSend(
                "/topic/devices/" + userId + "/status",
                Map.of("deviceId", deviceId.toString(), "status", status)
        );
    }

    private Device findOwned(UUID userId, UUID deviceId) {
        return deviceRepository.findByIdAndUserId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found: " + deviceId));
    }

    private DeviceResponse toResponse(Device device) {
        return DeviceResponse.builder()
                .id(device.getId())
                .deviceTypeId(device.getDeviceType().getId())
                .deviceTypeName(device.getDeviceType().getName())
                .name(device.getName())
                .location(device.getLocation())
                .mqttClientId(device.getMqttClientId())
                .status(device.getStatus().name())
                .config(device.getConfig())
                .lastSeenAt(device.getLastSeenAt())
                .createdAt(device.getCreatedAt())
                .updatedAt(device.getUpdatedAt())
                .build();
    }
}
