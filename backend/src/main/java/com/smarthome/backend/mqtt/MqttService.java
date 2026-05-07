package com.smarthome.backend.mqtt;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.hivemq.client.mqtt.MqttClient;
import com.hivemq.client.mqtt.mqtt5.Mqtt5AsyncClient;
import com.hivemq.client.mqtt.mqtt5.message.publish.Mqtt5Publish;
import com.smarthome.backend.command.DeviceCommandAckService;
import com.smarthome.backend.device.DeviceCreatedEvent;
import com.smarthome.backend.device.DeviceService;
import com.smarthome.backend.telemetry.TelemetryService;

import jakarta.annotation.PreDestroy;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Service
public class MqttService {

    private static final Logger log = LoggerFactory.getLogger(MqttService.class);

    private final MqttProperties mqttProperties;
    private final DeviceService deviceService;
    private final TelemetryService telemetryService;
    private final DeviceCommandAckService deviceCommandAckService;
    private final AtomicBoolean started = new AtomicBoolean(false);

    private volatile Mqtt5AsyncClient client;

    public MqttService(MqttProperties mqttProperties, DeviceService deviceService,
                       TelemetryService telemetryService,
                       DeviceCommandAckService deviceCommandAckService) {
        this.mqttProperties = mqttProperties;
        this.deviceService = deviceService;
        this.telemetryService = telemetryService;
        this.deviceCommandAckService = deviceCommandAckService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void connectOnStartup() {
        if (!started.compareAndSet(false, true)) {
            return;
        }

        client = MqttClient.builder()
                .useMqttVersion5()
                .identifier(mqttProperties.clientId())
                .serverHost(mqttProperties.host())
                .serverPort(mqttProperties.port())
                .sslWithDefaultConfig()
                .automaticReconnectWithDefaultConfig()
                .buildAsync();

        CompletableFuture<Void> connectFuture = hasCredentials()
                ? client.connectWith()
                        .simpleAuth()
                        .username(mqttProperties.username())
                        .password(mqttProperties.password().getBytes(StandardCharsets.UTF_8))
                        .applySimpleAuth()
                        .send()
                        .thenAccept(connAck -> log.info("Connected to HiveMQ Cloud as {}", mqttProperties.clientId()))
                        .thenApply(ignored -> null)
                : client.connectWith()
                        .send()
                        .thenAccept(connAck -> log.info("Connected to MQTT broker as {}", mqttProperties.clientId()))
                        .thenApply(ignored -> null);

        connectFuture
                .thenCompose(ignored -> subscribeToTelemetry())
                .thenCompose(ignored -> subscribeToStatus())
                .thenCompose(ignored -> subscribeToCommandAck())
                .exceptionally(throwable -> {
                    log.error("Unable to initialize MQTT client", throwable);
                    return null;
                });
    }

    public CompletableFuture<Void> publish(String topic, String payload) {
        if (client == null) {
            return CompletableFuture.failedFuture(new IllegalStateException("MQTT client is not initialized"));
        }

        return client.publishWith()
                .topic(topic)
                .payload(payload.getBytes(StandardCharsets.UTF_8))
                .send()
                .thenRun(() -> log.debug("Published on {}", topic));
    }

    public CompletableFuture<Void> publishCommand(UUID userId, UUID deviceId, String payload) {
        String topic = String.format("home/%s/device/%s/command", userId, deviceId);
        return publish(topic, payload);
    }

    private CompletableFuture<Void> subscribeToTelemetry() {
        return client.subscribeWith()
                .topicFilter(mqttProperties.topic().telemetryWildcard())
                .callback(this::handleTelemetryMessage)
                .send()
                .thenAccept(subAck -> log.info("Subscribed to {}", mqttProperties.topic().telemetryWildcard()))
                .thenApply(ignored -> null);
    }

    private CompletableFuture<Void> subscribeToStatus() {
        return client.subscribeWith()
                .topicFilter(mqttProperties.topic().statusWildcard())
                .callback(this::handleStatusMessage)
                .send()
                .thenAccept(subAck -> log.info("Subscribed to {}", mqttProperties.topic().statusWildcard()))
                .thenApply(ignored -> null);
    }

    private CompletableFuture<Void> subscribeToCommandAck() {
        return client.subscribeWith()
                .topicFilter(mqttProperties.topic().commandAckWildcard())
                .callback(this::handleCommandAckMessage)
                .send()
                .thenAccept(subAck -> log.info("Subscribed to {}", mqttProperties.topic().commandAckWildcard()))
                .thenApply(ignored -> null);
    }

    // topic: home/{userId}/device/{deviceId}/telemetry → deviceId at index 3
    private void handleTelemetryMessage(Mqtt5Publish publish) {
        String topic = publish.getTopic().toString();
        String payload = extractPayload(publish);
        log.debug("MQTT telemetry on {}: {}", topic, payload);
        parseDeviceId(topic, 3).ifPresent(deviceId -> {
            deviceService.updateDeviceOnline(deviceId);
            telemetryService.ingest(deviceId, payload);
        });
    }

    // topic: home/{userId}/device/{deviceId}/status → deviceId at index 3
    private void handleStatusMessage(Mqtt5Publish publish) {
        String topic = publish.getTopic().toString();
        String payload = extractPayload(publish);
        log.info("MQTT status on {}: {}", topic, payload);
        parseDeviceId(topic, 3).ifPresent(deviceId -> {
            if ("OFFLINE".equalsIgnoreCase(payload.trim())) {
                deviceService.updateDeviceOffline(deviceId);
            } else {
                deviceService.updateDeviceOnline(deviceId);
            }
        });
    }

    private void handleCommandAckMessage(Mqtt5Publish publish) {
        String topic = publish.getTopic().toString();
        String payload = extractPayload(publish);
        log.info("MQTT command ack on {}: {}", topic, payload);
        parseDeviceId(topic, 3).ifPresent(deviceId -> deviceCommandAckService.handleAck(deviceId, payload));
    }

    private String extractPayload(Mqtt5Publish publish) {
        return publish.getPayload()
                .map(bytes -> StandardCharsets.UTF_8.decode(bytes).toString())
                .orElse("");
    }

    private Optional<UUID> parseDeviceId(String topic, int index) {
        String[] parts = topic.split("/");
        if (parts.length > index) {
            try {
                return Optional.of(UUID.fromString(parts[index]));
            } catch (IllegalArgumentException e) {
                log.warn("Could not parse deviceId from topic segment '{}' in '{}'", parts[index], topic);
            }
        }
        return Optional.empty();
    }

    private boolean hasCredentials() {
        return mqttProperties.username() != null
                && !mqttProperties.username().isBlank()
                && mqttProperties.password() != null
                && !mqttProperties.password().isBlank();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDeviceCreated(DeviceCreatedEvent event) {
        if (client == null) return;
        String payload = String.format(
                "{\"action\":\"start\",\"deviceId\":\"%s\",\"userId\":\"%s\",\"type\":\"%s\",\"intervalMs\":%d}",
                event.deviceId(), event.userId(), event.deviceTypeName(), event.intervalMs()
        );
        publish("home/simulator/commands", payload)
                .exceptionally(ex -> { log.error("Failed to notify simulator of new device {}", event.deviceId(), ex); return null; });
    }

    @PreDestroy
    public void shutdown() {
        if (client != null) {
            client.disconnect();
        }
    }
}