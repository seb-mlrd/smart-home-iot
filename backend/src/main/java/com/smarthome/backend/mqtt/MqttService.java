package com.smarthome.backend.mqtt;

import java.nio.charset.StandardCharsets;
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

import jakarta.annotation.PreDestroy;

@Service
public class MqttService {

    private static final Logger log = LoggerFactory.getLogger(MqttService.class);

    private final MqttProperties mqttProperties;
    private final AtomicBoolean started = new AtomicBoolean(false);

    private volatile Mqtt5AsyncClient client;

    public MqttService(MqttProperties mqttProperties) {
        this.mqttProperties = mqttProperties;
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

    private CompletableFuture<Void> subscribeToTelemetry() {
        return client.subscribeWith()
                .topicFilter(mqttProperties.topic().telemetryWildcard())
                .callback(this::logReceivedMessage)
                .send()
                .thenAccept(subAck -> log.info("Subscribed to {}", mqttProperties.topic().telemetryWildcard()))
                .thenApply(ignored -> null);
    }

    private CompletableFuture<Void> subscribeToStatus() {
        return client.subscribeWith()
                .topicFilter(mqttProperties.topic().statusWildcard())
                .callback(this::logReceivedMessage)
                .send()
                .thenAccept(subAck -> log.info("Subscribed to {}", mqttProperties.topic().statusWildcard()))
                .thenApply(ignored -> null);
    }

    private void logReceivedMessage(Mqtt5Publish publish) {
        String payload = publish.getPayload()
                .map(bytes -> StandardCharsets.UTF_8.decode(bytes).toString())
                .orElse("");

        log.info("MQTT message received on {}: {}", publish.getTopic(), payload);
    }

    private boolean hasCredentials() {
        return mqttProperties.username() != null
                && !mqttProperties.username().isBlank()
                && mqttProperties.password() != null
                && !mqttProperties.password().isBlank();
    }

    @PreDestroy
    public void shutdown() {
        if (client != null) {
            client.disconnect();
        }
    }
}