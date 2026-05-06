package com.smarthome.backend.mqtt;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mqtt")
public record MqttProperties(
        String host,
        int port,
        String clientId,
        String username,
        String password,
        Topic topic
) {
    public record Topic(
            String telemetryWildcard,
            String statusWildcard,
            String commandAckWildcard
    ) {
    }
}