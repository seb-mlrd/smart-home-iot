package com.smarthome.backend.command;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthome.backend.command.dto.DeviceCommandRequest;
import com.smarthome.backend.command.dto.DeviceCommandResponse;
import com.smarthome.backend.domain.device.Device;
import com.smarthome.backend.domain.device.DeviceCommandStatus;
import com.smarthome.backend.domain.device.DeviceRepository;
import com.smarthome.backend.domain.device.DeviceType;
import com.smarthome.backend.exception.ResourceNotFoundException;
import com.smarthome.backend.exception.InvalidCommandException;
import com.smarthome.backend.mqtt.MqttService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceCommandService {

    private static final Set<String> REQUIRED_BOOLEAN_STATE_COMMANDS = Set.of("set_state");

    private final DeviceRepository deviceRepository;
    private final DeviceCommandRepository deviceCommandRepository;
    private final MqttService mqttService;
    private final ObjectMapper objectMapper;

    @Transactional
    public DeviceCommandResponse send(UUID userId, UUID deviceId, DeviceCommandRequest request) {
        Device device = findOwned(userId, deviceId);
        validateCommand(device.getDeviceType(), request);

        DeviceCommand command = DeviceCommand.builder()
                .device(device)
                .user(device.getUser())
                .command(request.command())
                .payload(serializePayload(request.payload()))
                .status(DeviceCommandStatus.SENT)
                .sentAt(OffsetDateTime.now())
                .build();
        command = deviceCommandRepository.save(command);

        ObjectNode outbound = objectMapper.createObjectNode();
        outbound.put("commandId", command.getId().toString());
        outbound.put("type", request.command());
        outbound.put("command", request.command());
        outbound.set("payload", request.payload() == null ? objectMapper.nullNode() : request.payload());
        outbound.put("timestamp", OffsetDateTime.now().toString());

        try {
            mqttService.publishCommand(userId, deviceId, outbound.toString()).join();
        } catch (Exception e) {
            command.setStatus(DeviceCommandStatus.ERROR);
            deviceCommandRepository.save(command);
            throw new InvalidCommandException("Unable to publish command to MQTT broker");
        }

        return toResponse(command);
    }

    @Transactional(readOnly = true)
    public List<DeviceCommandResponse> list(UUID userId, UUID deviceId, int limit) {
        findOwned(userId, deviceId);
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return deviceCommandRepository.findByDeviceIdAndUserIdOrderBySentAtDesc(deviceId, userId, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void markAcknowledged(UUID userId, UUID deviceId, UUID commandId) {
        deviceCommandRepository.findByIdAndDeviceIdAndUserId(commandId, deviceId, userId).ifPresent(command -> {
            command.setStatus(DeviceCommandStatus.ACK);
            command.setAckAt(OffsetDateTime.now());
            deviceCommandRepository.save(command);
        });
    }

    private void validateCommand(DeviceType deviceType, DeviceCommandRequest request) {
        if (request.command() == null || request.command().isBlank()) {
            throw new InvalidCommandException("Command name is required");
        }

        JsonNode capabilities = parseJson(deviceType.getCapabilities());
        JsonNode commands = capabilities.path("commands");
        boolean allowed = commands.isArray() && containsCommand(commands, request.command());
        if (!allowed) {
            throw new InvalidCommandException("Command not supported by device type: " + request.command());
        }

        if (REQUIRED_BOOLEAN_STATE_COMMANDS.contains(request.command())) {
            JsonNode payload = request.payload();
            if (payload == null || !payload.has("state") || (!payload.get("state").isBoolean() && !payload.get("state").isTextual())) {
                throw new InvalidCommandException("Command 'set_state' requires a boolean 'state' field");
            }
        }

        if ("set_temperature".equalsIgnoreCase(request.command())) {
            JsonNode payload = request.payload();
            if (payload == null || !payload.has("value") || !payload.get("value").isNumber()) {
                throw new InvalidCommandException("Command 'set_temperature' requires a numeric 'value' field");
            }
        }

        if ("set_position".equalsIgnoreCase(request.command())) {
            JsonNode payload = request.payload();
            if (payload == null || !payload.has("position") || !payload.get("position").isNumber()) {
                throw new InvalidCommandException("Command 'set_position' requires a numeric 'position' field (0-100)");
            }
        }
    }

    private boolean containsCommand(JsonNode commands, String command) {
        for (JsonNode node : commands) {
            if (command.equalsIgnoreCase(node.asText())) {
                return true;
            }
        }
        return false;
    }

    private JsonNode parseJson(String json) {
        try {
            return json == null || json.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(json);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }

    private String serializePayload(JsonNode payload) {
        try {
            return payload == null ? null : objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new InvalidCommandException("Invalid payload format");
        }
    }

    private Device findOwned(UUID userId, UUID deviceId) {
        return deviceRepository.findByIdAndUserId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found: " + deviceId));
    }

    private DeviceCommandResponse toResponse(DeviceCommand command) {
        return new DeviceCommandResponse(
                command.getId(),
                command.getDevice().getId(),
                command.getUser().getId(),
                command.getCommand(),
                deserializePayload(command.getPayload()),
                command.getStatus(),
                command.getSentAt(),
                command.getAckAt()
        );
    }

    private JsonNode deserializePayload(String payload) {
        try {
            return payload == null ? null : objectMapper.readTree(payload);
        } catch (Exception e) {
            return null;
        }
    }
}