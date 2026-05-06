package com.smarthome.backend.command;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.backend.domain.device.DeviceCommandStatus;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceCommandAckService {

    private static final Logger log = LoggerFactory.getLogger(DeviceCommandAckService.class);

    private final DeviceCommandRepository deviceCommandRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void handleAck(UUID deviceId, String payload) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            String commandIdValue = node.path("commandId").asText(null);
            if (commandIdValue == null || commandIdValue.isBlank()) {
                return;
            }
            UUID commandId = UUID.fromString(commandIdValue);
            deviceCommandRepository.findByIdAndDeviceId(commandId, deviceId).ifPresent(command -> {
                command.setStatus(DeviceCommandStatus.ACK);
                command.setAckAt(java.time.OffsetDateTime.now());
                deviceCommandRepository.save(command);
                log.info("Command {} acknowledged for device {}", commandId, deviceId);
            });
        } catch (Exception e) {
            log.warn("Unable to handle command ack for device {}: {}", deviceId, e.getMessage());
        }
    }
}