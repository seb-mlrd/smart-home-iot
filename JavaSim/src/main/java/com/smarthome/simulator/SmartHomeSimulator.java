package com.smarthome.simulator;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hivemq.client.mqtt.MqttClient;
import com.hivemq.client.mqtt.MqttGlobalPublishFilter;
import com.hivemq.client.mqtt.datatypes.MqttQos;
import com.hivemq.client.mqtt.mqtt5.Mqtt5BlockingClient;
import com.hivemq.client.mqtt.mqtt5.message.publish.Mqtt5Publish;

public class SmartHomeSimulator {

    private static final String DEFAULT_BROKER_HOST = "broker.hivemq.com";

    private static final String TOPIC_TEMP = "smarthome/salon/temp";
    private static final String TOPIC_LUX = "smarthome/salon/lux";
    private static final String TOPIC_LIGHT = "smarthome/salon/light";
    private static final String TOPIC_SHUTTER = "smarthome/chambre/shutter";

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final ZoneId LOCAL_ZONE = ZoneId.systemDefault();
    private static final double LUX_NOISE_MIN = -35.0;
    private static final double LUX_NOISE_MAX = 35.0;
    private static final double TEMP_NOISE_MIN = -0.25;
    private static final double TEMP_NOISE_MAX = 0.25;
    private static final double MESSAGE_DROP_PROBABILITY = 0.06;
    private static final int MESSAGE_MAX_EXTRA_DELAY_MS = 500;

    public static void main(String[] args) {
        String brokerHost = args.length > 0 && !args[0].isBlank() ? args[0] : DEFAULT_BROKER_HOST;

        System.out.printf("[SYSTEM] Demarrage du simulateur SmartHome sur broker '%s'%n", brokerHost);
        System.out.println("[SYSTEM] Objets actifs: capteur temperature, capteur lux, actionneur lumiere, actionneur volet");

        Thread tempThread = new Thread(() -> runTemperatureSensor(brokerHost), "sensor-temperature");
        Thread luxThread = new Thread(() -> runLuxSensor(brokerHost), "sensor-lux");
        Thread lightThread = new Thread(() -> runLightActuator(brokerHost), "actuator-light");
        Thread shutterThread = new Thread(() -> runShutterActuator(brokerHost), "actuator-shutter");

        tempThread.start();
        luxThread.start();
        lightThread.start();
        shutterThread.start();
    }

    private static void runTemperatureSensor(String brokerHost) {
        String clientId = "sim-temp-" + UUID.randomUUID();
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId);

        try {
            client.connect();
            System.out.printf("[TEMP] Connecte au broker avec clientId=%s%n", clientId);

            double currentValue = ThreadLocalRandom.current().nextDouble(19.0, 23.0);

            while (!Thread.currentThread().isInterrupted()) {
                double luxInfluence = computeLuxInfluence();
                double driftTowardComfort = luxInfluence * 0.08;
                double randomNoise = ThreadLocalRandom.current().nextDouble(TEMP_NOISE_MIN, TEMP_NOISE_MAX);
                currentValue = Math.max(18.0, Math.min(currentValue + driftTowardComfort + randomNoise, 25.0));

                double value = roundOneDecimal(currentValue);
                TemperatureMessage payload = new TemperatureMessage(value, "C", Instant.now().toEpochMilli());
                String json = MAPPER.writeValueAsString(payload);

                simulateNetworkConditions("TEMP", TOPIC_TEMP);
                client.publishWith()
                        .topic(TOPIC_TEMP)
                        .qos(MqttQos.AT_LEAST_ONCE)
                        .payload(json.getBytes(StandardCharsets.UTF_8))
                        .send();

                System.out.printf("[TEMP] Publie sur %s -> %s%n", TOPIC_TEMP, json);
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

    private static void runLuxSensor(String brokerHost) {
        String clientId = "sim-lux-" + UUID.randomUUID();
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId);

        try {
            client.connect();
            System.out.printf("[LUX] Connecte au broker avec clientId=%s%n", clientId);

            double currentValue = computeLuxBaseLevel() + ThreadLocalRandom.current().nextDouble(-20.0, 20.0);

            while (!Thread.currentThread().isInterrupted()) {
                double targetLevel = computeLuxBaseLevel();
                double inertia = (targetLevel - currentValue) * 0.18;
                double noise = ThreadLocalRandom.current().nextDouble(LUX_NOISE_MIN, LUX_NOISE_MAX);
                currentValue = Math.max(100.0, Math.min(currentValue + inertia + noise, 1000.0));

                int value = (int) Math.round(currentValue);
                LuxMessage payload = new LuxMessage(value, "lux", Instant.now().toEpochMilli());
                String json = MAPPER.writeValueAsString(payload);

                simulateNetworkConditions("LUX", TOPIC_LUX);
                client.publishWith()
                        .topic(TOPIC_LUX)
                        .qos(MqttQos.AT_LEAST_ONCE)
                        .payload(json.getBytes(StandardCharsets.UTF_8))
                        .send();

                System.out.printf("[LUX] Publie sur %s -> %s%n", TOPIC_LUX, json);
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

    private static void runLightActuator(String brokerHost) {
        String clientId = "sim-light-" + UUID.randomUUID();
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId);
        String lastState = null;

        try {
            client.connect();
            System.out.printf("[LIGHT] Connecte au broker avec clientId=%s%n", clientId);

            client.subscribeWith()
                    .topicFilter(TOPIC_LIGHT)
                    .qos(MqttQos.AT_LEAST_ONCE)
                    .send();
            System.out.printf("[LIGHT] Abonne au topic %s%n", TOPIC_LIGHT);

            try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                while (!Thread.currentThread().isInterrupted()) {
                    Mqtt5Publish publish = publishes.receive();
                    if (publish == null || publish.getPayload().isEmpty()) {
                        continue;
                    }

                    String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                    LightCommand command = MAPPER.readValue(body, LightCommand.class);
                    String state = command.state() != null ? command.state().trim().toUpperCase() : "OFF";

                    if (state.equals(lastState)) {
                        System.out.printf("[LIGHT] Etat identique ignore (%s)%n", state);
                        continue;
                    }

                    lastState = state;

                    System.out.printf("[LIGHT] Message recu sur %s -> %s%n", TOPIC_LIGHT, body);
                    System.out.printf("[LIGHT] LUMIERE : %s%n", "ON".equals(state) ? "ON" : "OFF");
                }
            }
        } catch (Exception e) {
            System.err.printf("[LIGHT] Erreur: %s%n", e.getMessage());
        } finally {
            disconnectQuietly(client, "LIGHT");
        }
    }

    private static void runShutterActuator(String brokerHost) {
        String clientId = "sim-shutter-" + UUID.randomUUID();
        Mqtt5BlockingClient client = createBlockingClient(brokerHost, clientId);
        int currentPosition = 0;

        try {
            client.connect();
            System.out.printf("[SHUTTER] Connecte au broker avec clientId=%s%n", clientId);

            client.subscribeWith()
                    .topicFilter(TOPIC_SHUTTER)
                    .qos(MqttQos.AT_LEAST_ONCE)
                    .send();
            System.out.printf("[SHUTTER] Abonne au topic %s%n", TOPIC_SHUTTER);

            try (Mqtt5BlockingClient.Mqtt5Publishes publishes = client.publishes(MqttGlobalPublishFilter.SUBSCRIBED)) {
                while (!Thread.currentThread().isInterrupted()) {
                    Mqtt5Publish publish = publishes.receive();
                    if (publish == null || publish.getPayload().isEmpty()) {
                        continue;
                    }

                    String body = StandardCharsets.UTF_8.decode(publish.getPayload().get()).toString();
                    Integer position = parseShutterPosition(body);
                    if (position == null) {
                        System.out.printf("[SHUTTER] Message non interpretable: %s%n", body);
                        continue;
                    }

                    position = Math.max(0, Math.min(position, 100));
                    System.out.printf("[SHUTTER] Message recu sur %s -> %s%n", TOPIC_SHUTTER, body);

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

    private static double computeLuxBaseLevel() {
        LocalTime now = LocalTime.now(LOCAL_ZONE);
        int minutes = now.getHour() * 60 + now.getMinute();
        double dayFactor = Math.max(0.0, Math.sin(((minutes - 360.0) / 1440.0) * Math.PI * 2.0));
        double baseLevel = 120.0 + dayFactor * 820.0;
        return Math.max(100.0, Math.min(baseLevel, 1000.0));
    }

    private static double computeLuxInfluence() {
        return computeLuxBaseLevel() - 550.0;
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

    private static Integer parseShutterPosition(String body) {
        try {
            ShutterCommand command = MAPPER.readValue(body, ShutterCommand.class);
            if (command.position() != null) {
                return command.position();
            }
        } catch (Exception ignored) {
            // Fallback vers une valeur brute si le message n'est pas un JSON.
        }

        try {
            return Integer.parseInt(body.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static Mqtt5BlockingClient createBlockingClient(String host, String clientId) {
        return MqttClient.builder()
                .useMqttVersion5()
                .identifier(clientId)
                .serverHost(host)
                .serverPort(1883)
                .buildBlocking();
    }

    private static void disconnectQuietly(Mqtt5BlockingClient client, String prefix) {
        try {
            if (client.getState().isConnected()) {
                client.disconnect();
                System.out.printf("[%s] Deconnecte proprement.%n", prefix);
            }
        } catch (Exception e) {
            System.err.printf("[%s] Erreur de deconnexion: %s%n", prefix, e.getMessage());
        }
    }

    private static double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    public record TemperatureMessage(double value, String unit, long timestamp) {}

    public record LuxMessage(int value, String unit, long timestamp) {}

    public record LightCommand(String state) {}

    public record ShutterCommand(Integer position) {}
}
