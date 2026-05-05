package com.smarthome.backend.domain.device;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeviceTypeRepository extends JpaRepository<DeviceType, UUID> {
}
