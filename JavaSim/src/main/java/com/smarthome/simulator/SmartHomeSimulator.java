package com.smarthome.simulator;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hivemq.client.mqtt.MqttClient;
import com.hivemq.client.mqtt.MqttGlobalPublishFilter;
import com.hivemq.client.mqtt.datatypes.MqttQos;
import com.hivemq.client.mqtt.mqtt5.Mqtt5BlockingClient;
import com.hivemq.client.mqtt.mqtt5.message.publish.Mqtt5Publish;

public class SmartHomeSimulator {

    private static final String DEFAULT_BROKER_HOST = "4108a3db64d742a5963319148924c7fd.s1.eu.hivemq.cloud";
    private static final String DEFAULT_BROKER_USERNAME = "Soblito";
    private static final String DEFAULT_BROKER_PASSWORD = "j'41m3HiveMQ";

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final ZoneId LOCAL_ZONE = ZoneId.systemDefault();
    private static final double TEMP_NOISE_MIN = -0.25;
    private static final double TEMP_NOISE_MAX = 0.25;
    private static final double MESSAGE_DROP_PROBABILITY = 0.06;
    private static final int MESSAGE_MAX_EXTRA_DELAY_MS = 500;

    public static void main(String[] args) {
        final String[] brokerHostRef = new String[] { DEFAULT_BROKER_HOST };
        final int[] brokerPortRef = new int[] { 8883 };
        final String[] brokerUserRef = new String[] { DEFAULT_BROKER_USERNAME };
        final String[] brokerPasswordRef = new String[] { DEFAULT_BROKER_PASSWORD };
        final String[] userIdRef = new String[] { "demo-user" };

        // try to load simple config.yml from resources
        InputStream cfgStream = SmartHomeSimulator.class.getResourceAsStream("/config.yml");
        List<Map<String, String>> devices = new ArrayList<>();

        if (cfgStream != null) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(cfgStream, StandardCharsets.UTF_8))) {
                String line;
                Map<String, String> currentDevice = null;
                while ((line = br.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                        continue;
                    }

                    if (trimmed.startsWith("broker:")) {
                        continue;
                    }

                    if (trimmed.startsWith("host:") || trimmed.startsWith("serverHost:")) {
                        String[] parts = trimmed.split(":" , 2);
                        if (parts.length > 1) brokerHostRef[0] = parts[1].trim();
                    } else if (trimmed.startsWith("port:")) {
                        String[] parts = trimmed.split(":" , 2);
                        if (parts.length > 1) brokerPortRef[0] = Integer.parseInt(parts[1].trim());
                    } else if (trimmed.startsWith("user:") || trimmed.startsWith("username:")) {
                        String[] parts = trimmed.split(":" , 2);
                        if (parts.length > 1) brokerUserRef[0] = parts[1].trim().replaceAll("\"", "");
                    } else if (trimmed.startsWith("password:")) {
                        String[] parts = trimmed.split(":" , 2);
                        if (parts.length > 1) brokerPasswordRef[0] = parts[1].trim().replaceAll("\"", "");
                    } else if (trimmed.startsWith("user_id:")) {
                        String[] parts = trimmed.split(":" , 2);
                        if (parts.length > 1) userIdRef[0] = parts[1].trim();
                    } else if (trimmed.startsWith("- id:")) {
                        if (currentDevice != null) devices.add(currentDevice);
                        currentDevice = new HashMap<>();
                        String[] parts = trimmed.split(":" , 2);
                        if (parts.length > 1) currentDevice.put("id", parts[1].trim());
                    } else if (trimmed.startsWith("type:")) {
                        if (currentDevice != null) {
                            String[] parts = trimmed.split(":" , 2);
                            if (parts.length > 1) currentDevice.put("type", parts[1].trim());
                        }
                    } else if (trimmed.startsWith("interval_ms:")) {
                        if (currentDevice != null) {
                            String[] parts = trimmed.split(":" , 2);
                            if (parts.length > 1) currentDevice.put("interval_ms", parts[1].trim());
                        }
                    }
                }
                if (currentDevice != null) devices.add(currentDevice);
            } catch (Exception e) {
                System.err.printf("[SYSTEM] Impossible de lire config.yml: %s%n", e.getMessage());
            }
        }

        System.out.printf("[SYSTEM] Demarrage du simulateur SmartHome sur broker '%s:%d' (user=%s) userId=%s%n", brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], userIdRef[0]);

        // if no devices defined, fallback to a default thermostat for quick testing
        if (devices.isEmpty()) {
            Map<String, String> thermo = new HashMap<>();
            thermo.put("id", "thermo-salon");
            thermo.put("type", "thermostat");
            thermo.put("interval_ms", "5000");
            devices.add(thermo);
        }

        for (Map<String, String> dev : devices) {
            String id = dev.get("id");
            String type = dev.get("type");
            int interval = Integer.parseInt(dev.getOrDefault("interval_ms", "5000"));
            if ("thermostat".equalsIgnoreCase(type)) {
                new Thread(() -> runThermostatDevice(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else if ("temperature_sensor".equalsIgnoreCase(type)) {
                new Thread(() -> runTemperatureSensor(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else if ("lux_sensor".equalsIgnoreCase(type)) {
                new Thread(() -> runLuxSensor(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else if ("light_actuator".equalsIgnoreCase(type)) {
                new Thread(() -> runLightActuator(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else if ("shutter_actuator".equalsIgnoreCase(type)) {
                new Thread(() -> runShutterActuator(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else if ("smart_plug".equalsIgnoreCase(type)) {
                new Thread(() -> runSmartPlug(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else if ("co2_sensor".equalsIgnoreCase(type)) {
                new Thread(() -> runCo2Sensor(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else if ("motion_detector".equalsIgnoreCase(type)) {
                new Thread(() -> runMotionDetector(brokerHostRef[0], brokerPortRef[0], brokerUserRef[0], brokerPasswordRef[0], userIdRef[0], id, interval), "device-" + id).start();
            } else {
                System.out.printf("[SYSTEM] Type de device non geré actuellement: %s (id=%s)%n", type, id);
            }
        }
    }

    private static void runThermostatDevice(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        String telemetryTopic = String.format("home/%s/device/%s/telemetry", userId, deviceId);
        String commandTopic = String.format("home/%s/device/%s/command", userId, deviceId);
        String commandAckTopic = String.format("home/%s/device/%s/command/ack", userId, deviceId);

        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");

        final double[] currentTemp = { ThreadLocalRandom.current().nextDouble(19.0, 23.0) };
        final double[] targetTemp = { 22.0 };
        final double[] humidity = { ThreadLocalRandom.current().nextDouble(40.0, 55.0) };
        final boolean[] heatingActive = { false };

        try {
            client.connect();
            System.out.printf("[THERMO:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            // subscribe to commands
            client.subscribeWith().topicFilter(commandTopic).qos(MqttQos.AT_LEAST_ONCE).send();
            System.out.printf("[THERMO:%s] Abonne au topic %s%n", deviceId, commandTopic);

            // subscriber thread
            Thread subscriber = new Thread(() -> {
                try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                    while (!Thread.currentThread().isInterrupted()) {
                        Mqtt5Publish publish = publishes.receive();
                        if (publish == null || publish.getPayload().isEmpty()) continue;
                        String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                        try {
                            ObjectNode node = (ObjectNode) MAPPER.readTree(body);
                            String commandId = node.has("commandId") ? node.get("commandId").asText() : UUID.randomUUID().toString();
                            String type = node.has("type") ? node.get("type").asText() : "";
                            if ("set_temperature".equalsIgnoreCase(type) && node.has("payload") && node.get("payload").has("value")) {
                                double v = node.get("payload").get("value").asDouble();
                                targetTemp[0] = v;
                                heatingActive[0] = targetTemp[0] > currentTemp[0];
                                System.out.printf("[THERMO:%s] Command recu set_temperature -> %s%n", deviceId, body);
                                // ack
                                ObjectNode ack = MAPPER.createObjectNode();
                                ack.put("commandId", commandId);
                                ack.put("status", "ACK");
                                ack.put("ts", Instant.now().toEpochMilli());
                                client.publishWith().topic(commandAckTopic).qos(MqttQos.AT_LEAST_ONCE).payload(MAPPER.writeValueAsBytes(ack)).send();
                            }
                        } catch (Exception e) {
                            System.err.printf("[THERMO:%s] Erreur parsing commande: %s%n", deviceId, e.getMessage());
                        }
                    }
                } catch (Exception e) {
                    System.err.printf("[THERMO:%s] Subscriber error: %s%n", deviceId, e.getMessage());
                }
            }, "thermo-subscriber-" + deviceId);
            subscriber.setDaemon(true);
            subscriber.start();

            // publisher loop
            while (!Thread.currentThread().isInterrupted()) {
                double driftTowardTarget = (targetTemp[0] - currentTemp[0]) * 0.2;
                double randomNoise = ThreadLocalRandom.current().nextDouble(TEMP_NOISE_MIN, TEMP_NOISE_MAX);
                currentTemp[0] = Math.max(5.0, Math.min(currentTemp[0] + driftTowardTarget + randomNoise, 35.0));
                humidity[0] = Math.max(10.0, Math.min(humidity[0] + ThreadLocalRandom.current().nextDouble(-0.5, 0.5), 90.0));
                heatingActive[0] = targetTemp[0] > currentTemp[0];

                ObjectNode payload = MAPPER.createObjectNode();
                payload.put("deviceId", deviceId);
                payload.put("temperature", Math.round(currentTemp[0]*10.0)/10.0);
                payload.put("humidity", Math.round(humidity[0]*10.0)/10.0);
                payload.put("target_temperature", Math.round(targetTemp[0]*10.0)/10.0);
                payload.put("heating_active", heatingActive[0]);
                payload.put("ts", Instant.now().toEpochMilli());

                String json = MAPPER.writeValueAsString(payload);

                simulateNetworkConditions("THERMO", telemetryTopic);
                client.publishWith().topic(telemetryTopic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                System.out.printf("[THERMO:%s] Publie sur %s -> %s%n", deviceId, telemetryTopic, json);
                Thread.sleep(intervalMs);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.printf("[THERMO:%s] Thread interrompu.%n", deviceId);
        } catch (Exception e) {
            System.err.printf("[THERMO:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                // publish OFFLINE then disconnect
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            disconnectQuietly(client, "THERMO:" + deviceId);
        }
    }

    private static double computeLuxBaseLevel() {
        LocalTime now = LocalTime.now(LOCAL_ZONE);
        int minutes = now.getHour() * 60 + now.getMinute();
        double dayFactor = Math.max(0.0, Math.sin(((minutes - 360.0) / 1440.0) * Math.PI * 2.0));
        double baseLevel = 120.0 + dayFactor * 820.0;
        return Math.max(100.0, Math.min(baseLevel, 1000.0));
    }

    private static void runTemperatureSensor(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String telemetryTopic = String.format("home/%s/device/%s/telemetry", userId, deviceId);
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");

        try {
            client.connect();
            System.out.printf("[TEMP:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            double currentValue = ThreadLocalRandom.current().nextDouble(19.0, 23.0);

            while (!Thread.currentThread().isInterrupted()) {
                double luxInfluence = computeLuxBaseLevel() - 550.0;
                double driftTowardComfort = luxInfluence * 0.08;
                double randomNoise = ThreadLocalRandom.current().nextDouble(TEMP_NOISE_MIN, TEMP_NOISE_MAX);
                currentValue = Math.max(18.0, Math.min(currentValue + driftTowardComfort + randomNoise, 25.0));

                double value = Math.round(currentValue * 10.0) / 10.0;
                ObjectNode payload = MAPPER.createObjectNode();
                payload.put("temperature", value);
                payload.put("unit", "C");
                payload.put("timestamp", Instant.now().toEpochMilli());
                String json = MAPPER.writeValueAsString(payload);

                simulateNetworkConditions("TEMP:" + deviceId, telemetryTopic);
                client.publishWith().topic(telemetryTopic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                System.out.printf("[TEMP:%s] Publie sur %s -> %s%n", deviceId, telemetryTopic, json);
                Thread.sleep(intervalMs);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.printf("[TEMP:%s] Thread interrompu.%n", deviceId);
        } catch (Exception e) {
            System.err.printf("[TEMP:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            try {
                if (client != null) client.disconnect();
            } catch (Exception ignored) {}
        }
    }

    private static void runLegacyTemperatureSensor(String brokerHost, String username, String password) {
        String clientId = "sim-temp-" + UUID.randomUUID();
        String topic = "smarthome/salon/temp";
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId, username, password);

        try {
            client.connect();
            System.out.printf("[TEMP] Connecte au broker avec clientId=%s%n", clientId);

            double currentValue = ThreadLocalRandom.current().nextDouble(19.0, 23.0);

            while (!Thread.currentThread().isInterrupted()) {
                double luxInfluence = computeLuxBaseLevel() - 550.0;
                double driftTowardComfort = luxInfluence * 0.08;
                double randomNoise = ThreadLocalRandom.current().nextDouble(TEMP_NOISE_MIN, TEMP_NOISE_MAX);
                currentValue = Math.max(18.0, Math.min(currentValue + driftTowardComfort + randomNoise, 25.0));

                double value = Math.round(currentValue * 10.0) / 10.0;
                String json = String.format("{\"value\":%.1f,\"unit\":\"C\",\"timestamp\":%d}", value, Instant.now().toEpochMilli());

                simulateNetworkConditions("TEMP", topic);
                client.publishWith().topic(topic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                System.out.printf("[TEMP] Publie sur %s -> %s%n", topic, json);
                Thread.sleep(5000);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.println("[TEMP] Thread interrompu, arret du capteur temperature.");
        } catch (Exception e) {
            System.err.printf("[TEMP] Erreur: %s%n", e.getMessage());
        } finally {
            disconnectQuietly(client, "TEMP");
        }
    }

    private static void runLuxSensor(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String telemetryTopic = String.format("home/%s/device/%s/telemetry", userId, deviceId);
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");

        try {
            client.connect();
            System.out.printf("[LUX:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            double currentValue = computeLuxBaseLevel() + ThreadLocalRandom.current().nextDouble(-20.0, 20.0);

            while (!Thread.currentThread().isInterrupted()) {
                double targetLevel = computeLuxBaseLevel();
                double inertia = (targetLevel - currentValue) * 0.18;
                double noise = ThreadLocalRandom.current().nextDouble(-35.0, 35.0);
                currentValue = Math.max(100.0, Math.min(currentValue + inertia + noise, 1000.0));

                int value = (int) Math.round(currentValue);
                ObjectNode payload = MAPPER.createObjectNode();
                payload.put("lux", value);
                payload.put("unit", "lux");
                payload.put("timestamp", Instant.now().toEpochMilli());
                String json = MAPPER.writeValueAsString(payload);

                simulateNetworkConditions("LUX:" + deviceId, telemetryTopic);
                client.publishWith().topic(telemetryTopic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                System.out.printf("[LUX:%s] Publie sur %s -> %s%n", deviceId, telemetryTopic, json);
                Thread.sleep(intervalMs);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.printf("[LUX:%s] Thread interrompu.%n", deviceId);
        } catch (Exception e) {
            System.err.printf("[LUX:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            try {
                if (client != null) client.disconnect();
            } catch (Exception ignored) {}
        }
    }

    private static void runLegacyLuxSensor(String brokerHost, String username, String password) {
        String clientId = "sim-lux-" + UUID.randomUUID();
        String topic = "smarthome/salon/lux";
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId, username, password);

        try {
            client.connect();
            System.out.printf("[LUX] Connecte au broker avec clientId=%s%n", clientId);

            double currentValue = computeLuxBaseLevel() + ThreadLocalRandom.current().nextDouble(-20.0, 20.0);

            while (!Thread.currentThread().isInterrupted()) {
                double targetLevel = computeLuxBaseLevel();
                double inertia = (targetLevel - currentValue) * 0.18;
                double noise = ThreadLocalRandom.current().nextDouble(-35.0, 35.0);
                currentValue = Math.max(100.0, Math.min(currentValue + inertia + noise, 1000.0));

                int value = (int) Math.round(currentValue);
                String json = String.format("{\"value\":%d,\"unit\":\"lux\",\"timestamp\":%d}", value, Instant.now().toEpochMilli());

                simulateNetworkConditions("LUX", topic);
                client.publishWith().topic(topic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                System.out.printf("[LUX] Publie sur %s -> %s%n", topic, json);
                Thread.sleep(3000);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.println("[LUX] Thread interrompu, arret du capteur lux.");
        } catch (Exception e) {
            System.err.printf("[LUX] Erreur: %s%n", e.getMessage());
        } finally {
            disconnectQuietly(client, "LUX");
        }
    }

    private static void runLightActuator(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String commandTopic = String.format("home/%s/device/%s/command", userId, deviceId);
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");
        String lastState = null;

        try {
            client.connect();
            System.out.printf("[LIGHT:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            client.subscribeWith().topicFilter(commandTopic).qos(MqttQos.AT_LEAST_ONCE).send();
            System.out.printf("[LIGHT:%s] Abonne au topic %s%n", deviceId, commandTopic);

            try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                while (!Thread.currentThread().isInterrupted()) {
                    Mqtt5Publish publish = publishes.receive();
                    if (publish == null || publish.getPayload().isEmpty()) continue;

                    String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                    try {
                        ObjectNode node = (ObjectNode) MAPPER.readTree(body);
                        String state = node.has("state") ? node.get("state").asText().toUpperCase() : "OFF";
                        if (state.equals(lastState)) {
                            System.out.printf("[LIGHT:%s] Etat identique ignore (%s)%n", deviceId, state);
                            continue;
                        }
                        lastState = state;
                        System.out.printf("[LIGHT:%s] Commande recue sur %s -> %s%n", deviceId, commandTopic, body);
                        System.out.printf("[LIGHT:%s] LUMIERE : %s%n", deviceId, "ON".equals(state) ? "ON" : "OFF");
                    } catch (Exception e) {
                        System.err.printf("[LIGHT:%s] Erreur parsing: %s%n", deviceId, e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.printf("[LIGHT:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            try {
                if (client != null) client.disconnect();
            } catch (Exception ignored) {}
        }
    }

    private static void runLegacyLightActuator(String brokerHost, String username, String password) {
        String clientId = "sim-light-" + UUID.randomUUID();
        String topic = "smarthome/salon/light";
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId, username, password);
        String lastState = null;

        try {
            client.connect();
            System.out.printf("[LIGHT] Connecte au broker avec clientId=%s%n", clientId);

            client.subscribeWith().topicFilter(topic).qos(MqttQos.AT_LEAST_ONCE).send();
            System.out.printf("[LIGHT] Abonne au topic %s%n", topic);

            try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                while (!Thread.currentThread().isInterrupted()) {
                    Mqtt5Publish publish = publishes.receive();
                    if (publish == null || publish.getPayload().isEmpty()) continue;

                    String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                    try {
                        ObjectNode node = (ObjectNode) MAPPER.readTree(body);
                        String state = node.has("state") ? node.get("state").asText().toUpperCase() : "OFF";
                        if (state.equals(lastState)) {
                            System.out.printf("[LIGHT] Etat identique ignore (%s)%n", state);
                            continue;
                        }
                        lastState = state;
                        System.out.printf("[LIGHT] Message recu sur %s -> %s%n", topic, body);
                        System.out.printf("[LIGHT] LUMIERE : %s%n", "ON".equals(state) ? "ON" : "OFF");
                    } catch (Exception e) {
                        System.err.printf("[LIGHT] Erreur parsing: %s%n", e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.printf("[LIGHT] Erreur: %s%n", e.getMessage());
        } finally {
            disconnectQuietly(client, "LIGHT");
        }
    }

    private static void runShutterActuator(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String commandTopic = String.format("home/%s/device/%s/command", userId, deviceId);
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");
        int currentPosition = 0;

        try {
            client.connect();
            System.out.printf("[SHUTTER:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            client.subscribeWith().topicFilter(commandTopic).qos(MqttQos.AT_LEAST_ONCE).send();
            System.out.printf("[SHUTTER:%s] Abonne au topic %s%n", deviceId, commandTopic);

            try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                while (!Thread.currentThread().isInterrupted()) {
                    Mqtt5Publish publish = publishes.receive();
                    if (publish == null || publish.getPayload().isEmpty()) continue;

                    String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                    Integer position = parseShutterPosition(body);
                    if (position == null) {
                        System.out.printf("[SHUTTER:%s] Commande non interpretable: %s%n", deviceId, body);
                        continue;
                    }

                    position = Math.max(0, Math.min(position, 100));
                    System.out.printf("[SHUTTER:%s] Commande recue sur %s -> %s%n", deviceId, commandTopic, body);

                    while (currentPosition != position) {
                        if (currentPosition < position) {
                            currentPosition = Math.min(currentPosition + 5, position);
                        } else {
                            currentPosition = Math.max(currentPosition - 5, position);
                        }

                        System.out.printf("[SHUTTER:%s] Position volet: %d%%%n", deviceId, currentPosition);
                        Thread.sleep(180);
                    }
                }
            }
        } catch (Exception e) {
            System.err.printf("[SHUTTER:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            try {
                if (client != null) client.disconnect();
            } catch (Exception ignored) {}
        }
    }

    private static void runSmartPlug(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String telemetryTopic = String.format("home/%s/device/%s/telemetry", userId, deviceId);
        String commandTopic = String.format("home/%s/device/%s/command", userId, deviceId);
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");

        final boolean[] isOn = { false };
        final double[] energyTotal = { 0.0 }; // kWh accumulated
        final double voltageV = 230.0;

        try {
            client.connect();
            System.out.printf("[PLUG:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            // subscribe to commands
            client.subscribeWith().topicFilter(commandTopic).qos(MqttQos.AT_LEAST_ONCE).send();
            System.out.printf("[PLUG:%s] Abonne au topic %s%n", deviceId, commandTopic);

            // Thread for handling commands
            Thread commandHandler = new Thread(() -> {
                try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                    while (!Thread.currentThread().isInterrupted()) {
                        Mqtt5Publish publish = publishes.receive();
                        if (publish == null || publish.getPayload().isEmpty()) continue;
                        String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                        try {
                            ObjectNode node = (ObjectNode) MAPPER.readTree(body);
                            String commandType = node.has("type") ? node.get("type").asText() : "";
                            
                            if ("toggle".equalsIgnoreCase(commandType)) {
                                isOn[0] = !isOn[0];
                                System.out.printf("[PLUG:%s] Commande toggle -> is_on=%s%n", deviceId, isOn[0]);
                            } else if ("set_state".equalsIgnoreCase(commandType) && node.has("payload")) {
                                boolean newState = node.get("payload").get("state").asBoolean();
                                isOn[0] = newState;
                                System.out.printf("[PLUG:%s] Commande set_state -> is_on=%s%n", deviceId, isOn[0]);
                            }
                        } catch (Exception e) {
                            System.err.printf("[PLUG:%s] Erreur parsing commande: %s%n", deviceId, e.getMessage());
                        }
                    }
                } catch (Exception e) {
                    System.err.printf("[PLUG:%s] Erreur commandHandler: %s%n", deviceId, e.getMessage());
                }
            }, "plug-cmd-" + deviceId);
            commandHandler.start();

            // Main telemetry loop
            long lastPublishMs = System.currentTimeMillis();
            while (!Thread.currentThread().isInterrupted()) {
                // Simulate current draw: 0A when OFF, 0.5-2.0A when ON
                double currentA = isOn[0] ? ThreadLocalRandom.current().nextDouble(0.5, 2.0) : 0.0;
                double powerW = voltageV * currentA;
                
                // Accumulate energy (in kWh) - increment based on interval
                if (isOn[0]) {
                    double energyIncrement = (powerW / 1000.0) * (intervalMs / 3600000.0); // W to kW, ms to hours
                    energyTotal[0] += energyIncrement;
                }

                ObjectNode payload = MAPPER.createObjectNode();
                payload.put("power_w", Math.round(powerW * 10.0) / 10.0);
                payload.put("voltage_v", voltageV);
                payload.put("current_a", Math.round(currentA * 100.0) / 100.0);
                payload.put("energy_kwh_total", Math.round(energyTotal[0] * 1000.0) / 1000.0);
                payload.put("is_on", isOn[0]);
                payload.put("timestamp", Instant.now().toEpochMilli());
                String json = MAPPER.writeValueAsString(payload);

                simulateNetworkConditions("PLUG:" + deviceId, telemetryTopic);
                client.publishWith().topic(telemetryTopic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                System.out.printf("[PLUG:%s] Publie sur %s -> %s%n", deviceId, telemetryTopic, json);
                Thread.sleep(intervalMs);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.printf("[PLUG:%s] Thread interrompu.%n", deviceId);
        } catch (Exception e) {
            System.err.printf("[PLUG:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            try {
                if (client != null) client.disconnect();
            } catch (Exception ignored) {}
        }
    }

    private static void runCo2Sensor(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String telemetryTopic = String.format("home/%s/device/%s/telemetry", userId, deviceId);
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");

        try {
            client.connect();
            System.out.printf("[CO2:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            double currentCo2 = ThreadLocalRandom.current().nextDouble(600.0, 1000.0);
            double currentPm25 = ThreadLocalRandom.current().nextDouble(10.0, 30.0);

            while (!Thread.currentThread().isInterrupted()) {
                // CO2 simulation: base 400ppm + peak during day (occupancy) + random walk
                double hourOfDay = (System.currentTimeMillis() % 86400000) / 3600000.0; // 0-24
                double occupancyFactor = Math.sin((hourOfDay - 6) * Math.PI / 12.0); // peak at noon
                occupancyFactor = Math.max(0.1, occupancyFactor); // never below 0.1
                
                double co2Base = 400.0 + (occupancyFactor * 700.0); // 400-1100 ppm
                double co2Drift = (Math.random() - 0.5) * 100.0; // ±50 ppm random
                currentCo2 = Math.max(400.0, Math.min(currentCo2 + co2Drift * 0.1, 1500.0));
                currentCo2 = co2Base * 0.3 + currentCo2 * 0.7; // smooth blend

                // PM2.5: inversely correlated with time of day (higher at night/pollution)
                double pm25Drift = (Math.random() - 0.5) * 20.0;
                currentPm25 = Math.max(5.0, Math.min(currentPm25 + pm25Drift * 0.05, 300.0));

                // Air Quality Index (AQI-like): simple mapping
                int aqi = calculateAQI(currentCo2, currentPm25);

                // Re-use temperature/humidity from lux cycle (ambient conditions)
                double ambientTemp = 20.0 + 5.0 * Math.sin((hourOfDay - 6) * Math.PI / 12.0);
                double ambientHumidity = 50.0 + 10.0 * Math.sin((hourOfDay - 6) * Math.PI / 12.0 + 1.0);

                ObjectNode payload = MAPPER.createObjectNode();
                payload.put("co2_ppm", Math.round(currentCo2));
                payload.put("pm25", Math.round(currentPm25 * 10.0) / 10.0);
                payload.put("temperature", Math.round(ambientTemp * 10.0) / 10.0);
                payload.put("humidity", Math.round(ambientHumidity * 10.0) / 10.0);
                payload.put("air_quality_index", aqi);
                payload.put("timestamp", Instant.now().toEpochMilli());
                String json = MAPPER.writeValueAsString(payload);

                simulateNetworkConditions("CO2:" + deviceId, telemetryTopic);
                client.publishWith().topic(telemetryTopic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                System.out.printf("[CO2:%s] Publie sur %s -> %s%n", deviceId, telemetryTopic, json);
                Thread.sleep(intervalMs);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.printf("[CO2:%s] Thread interrompu.%n", deviceId);
        } catch (Exception e) {
            System.err.printf("[CO2:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            try {
                if (client != null) client.disconnect();
            } catch (Exception ignored) {}
        }
    }

    private static int calculateAQI(double co2ppm, double pm25) {
        // Simplified AQI calculation
        // CO2: 400 = 0, 1000 = 50, 1500 = 100
        int co2_aqi = Math.min(100, (int) ((co2ppm - 400.0) / 11.0));
        
        // PM2.5: 0 = 0, 50 = 100, 300 = 500 (capped at 200)
        int pm25_aqi = Math.min(200, (int) (pm25 * 2.0));
        
        return Math.max(co2_aqi, pm25_aqi);
    }

    private static void runMotionDetector(String host, int port, String username, String password, String userId, String deviceId, int intervalMs) {
        String clientId = "sim-" + userId + "-" + deviceId;
        String telemetryTopic = String.format("home/%s/device/%s/telemetry", userId, deviceId);
        String statusTopic = String.format("home/%s/device/%s/status", userId, deviceId);
        Mqtt5BlockingClient client = createBlockingClientWithWill(host, port, clientId, username, password, statusTopic, "OFFLINE");

        try {
            client.connect();
            System.out.printf("[MOTION:%s] Connecte au broker avec clientId=%s%n", deviceId, clientId);

            // publish ONLINE status
            client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("ONLINE".getBytes(StandardCharsets.UTF_8)).send();

            boolean lastMotionDetected = false;
            boolean lastDoorOpen = false;
            double batteryLevel = 100.0;
            long lastPublishMs = System.currentTimeMillis();

            while (!Thread.currentThread().isInterrupted()) {
                // Motion detection: 15% probability per interval
                boolean motionDetected = ThreadLocalRandom.current().nextDouble() < 0.15;
                
                // Save previous state before potentially changing door state
                boolean previousDoorOpen = lastDoorOpen;
                
                // Door open: 5% probability of state change per interval
                if (ThreadLocalRandom.current().nextDouble() < 0.05) {
                    lastDoorOpen = !lastDoorOpen;
                }
                
                // Battery decays very slowly: ~0.5% per day of continuous operation
                batteryLevel = Math.max(0.0, batteryLevel - 0.001);

                // Event-driven: only publish if state changed
                boolean stateChanged = (motionDetected != lastMotionDetected) || 
                                      (lastDoorOpen != previousDoorOpen);

                if (stateChanged || (System.currentTimeMillis() - lastPublishMs > 60000)) {
                    ObjectNode payload = MAPPER.createObjectNode();
                    payload.put("motion_detected", motionDetected);
                    payload.put("door_open", lastDoorOpen);
                    payload.put("battery_level", Math.round(batteryLevel * 10.0) / 10.0);
                    payload.put("timestamp", Instant.now().toEpochMilli());
                    String json = MAPPER.writeValueAsString(payload);

                    simulateNetworkConditions("MOTION:" + deviceId, telemetryTopic);
                    client.publishWith().topic(telemetryTopic).qos(MqttQos.AT_LEAST_ONCE).payload(json.getBytes(StandardCharsets.UTF_8)).send();

                    System.out.printf("[MOTION:%s] Publie sur %s -> %s%n", deviceId, telemetryTopic, json);
                    lastPublishMs = System.currentTimeMillis();
                } else if (motionDetected) {
                    System.out.printf("[MOTION:%s] Mouvement détecté (pas de changement d'état)%n", deviceId);
                }

                lastMotionDetected = motionDetected;
                Thread.sleep(intervalMs);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.printf("[MOTION:%s] Thread interrompu.%n", deviceId);
        } catch (Exception e) {
            System.err.printf("[MOTION:%s] Erreur: %s%n", deviceId, e.getMessage());
        } finally {
            try {
                if (client != null && client.getState().isConnected()) {
                    client.publishWith().topic(statusTopic).qos(MqttQos.AT_LEAST_ONCE).payload("OFFLINE".getBytes(StandardCharsets.UTF_8)).send();
                }
            } catch (Exception ignored) {}
            try {
                if (client != null) client.disconnect();
            } catch (Exception ignored) {}
        }
    }

    private static void runLegacyShutterActuator(String brokerHost, String username, String password) {
        String clientId = "sim-shutter-" + UUID.randomUUID();
        String topic = "smarthome/chambre/shutter";
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId, username, password);
        int currentPosition = 0;

        try {
            client.connect();
            System.out.printf("[SHUTTER] Connecte au broker avec clientId=%s%n", clientId);

            client.subscribeWith().topicFilter(topic).qos(MqttQos.AT_LEAST_ONCE).send();
            System.out.printf("[SHUTTER] Abonne au topic %s%n", topic);

            try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                while (!Thread.currentThread().isInterrupted()) {
                    Mqtt5Publish publish = publishes.receive();
                    if (publish == null || publish.getPayload().isEmpty()) continue;

                    String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                    Integer position = parseShutterPosition(body);
                    if (position == null) {
                        System.out.printf("[SHUTTER] Message non interpretable: %s%n", body);
                        continue;
                    }

                    position = Math.max(0, Math.min(position, 100));
                    System.out.printf("[SHUTTER] Message recu sur %s -> %s%n", topic, body);

                    while (currentPosition != position) {
                        if (currentPosition < position) {
                            currentPosition = Math.min(currentPosition + 5, position);
                        } else {
                            currentPosition = Math.max(currentPosition - 5, position);
                        }

                        System.out.printf("[SHUTTER] Position volet: %d%%%n", currentPosition);
                        Thread.sleep(180);
                    }
                }
            }
        } catch (Exception e) {
            System.err.printf("[SHUTTER] Erreur: %s%n", e.getMessage());
        } finally {
            disconnectQuietly(client, "SHUTTER");
        }
    }

    private static Integer parseShutterPosition(String body) {
        try {
            ObjectNode node = (ObjectNode) MAPPER.readTree(body);
            if (node.has("position")) return node.get("position").asInt();
        } catch (Exception ignored) {}
        try {
            return Integer.parseInt(body.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static Mqtt5BlockingClient createBlockingClient(String host, String clientId, String username, String password) {
        return MqttClient.builder()
                .useMqttVersion5()
                .identifier(clientId)
                .serverHost(host)
                .serverPort(8883)
                .sslWithDefaultConfig()
                .simpleAuth()
                .username(username)
                .password(password.getBytes(StandardCharsets.UTF_8))
                .applySimpleAuth()
                .buildBlocking();
    }

    private static void simulateNetworkConditions(String devicePrefix, String topic) throws InterruptedException {
        if (ThreadLocalRandom.current().nextDouble() < MESSAGE_DROP_PROBABILITY) {
            System.out.printf("[%s] Message suppose perdu sur %s%n", devicePrefix, topic);
            Thread.sleep(ThreadLocalRandom.current().nextInt(150, 450));
        } else if (ThreadLocalRandom.current().nextDouble() < 0.18) {
            int delay = ThreadLocalRandom.current().nextInt(80, MESSAGE_MAX_EXTRA_DELAY_MS + 1);
            System.out.printf("[%s] Latence reseau simulee sur %s: %d ms%n", devicePrefix, topic, delay);
            Thread.sleep(delay);
        }
    }

    private static Mqtt5BlockingClient createBlockingClientWithWill(String host, int port, String clientId, String username, String password, String willTopic, String willPayload) {
        try {
            return MqttClient.builder()
                    .useMqttVersion5()
                    .identifier(clientId)
                    .serverHost(host)
                    .serverPort(port)
                    .sslWithDefaultConfig()
                    .simpleAuth()
                    .username(username)
                    .password(password.getBytes(StandardCharsets.UTF_8))
                    .applySimpleAuth()
                    .willPublish()
                        .topic(willTopic)
                        .payload(willPayload.getBytes(StandardCharsets.UTF_8))
                        .qos(MqttQos.AT_LEAST_ONCE)
                        .applyWillPublish()
                    .buildBlocking();
        } catch (Exception e) {
            // if willPublish api differs, fall back to without will
            return MqttClient.builder()
                    .useMqttVersion5()
                    .identifier(clientId)
                    .serverHost(host)
                    .serverPort(port)
                    .sslWithDefaultConfig()
                    .simpleAuth()
                    .username(username)
                    .password(password.getBytes(StandardCharsets.UTF_8))
                    .applySimpleAuth()
                    .buildBlocking();
        }
    }

    private static void disconnectQuietly(Mqtt5BlockingClient client, String prefix) {
        try {
            if (client != null && client.getState().isConnected()) {
                client.disconnect();
                System.out.printf("[%s] Deconnecte proprement.%n", prefix);
            }
        } catch (Exception e) {
            System.err.printf("[%s] Erreur de deconnexion: %s%n", prefix, e.getMessage());
        }
    }

    public record TemperatureMessage(double value, String unit, long timestamp) {}

}
