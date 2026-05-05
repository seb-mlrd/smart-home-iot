package com.smarthome.backend.device;

import com.smarthome.backend.device.dto.*;
import com.smarthome.backend.domain.device.*;
import com.smarthome.backend.domain.user.User;
import com.smarthome.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceTypeRepository deviceTypeRepository;

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
        return toResponse(deviceRepository.save(device));
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
        });
    }

    @Transactional
    public void updateDeviceOffline(UUID deviceId) {
        deviceRepository.findById(deviceId).ifPresent(device -> {
            device.setStatus(DeviceStatus.OFFLINE);
            deviceRepository.save(device);
        });
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
