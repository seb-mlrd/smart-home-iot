package com.smarthome.backend.command;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, UUID> {
    List<DeviceCommand> findByDeviceIdAndUserIdOrderBySentAtDesc(UUID deviceId, UUID userId, Pageable pageable);
    Optional<DeviceCommand> findByIdAndDeviceIdAndUserId(UUID id, UUID deviceId, UUID userId);
    Optional<DeviceCommand> findByIdAndDeviceId(UUID id, UUID deviceId);
}