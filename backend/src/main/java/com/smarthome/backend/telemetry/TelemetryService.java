package com.smarthome.backend.telemetry;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.backend.device.DeviceService;
import com.smarthome.backend.domain.device.DeviceRepository;
import com.smarthome.backend.mqtt.dto.MetricItem;
import com.smarthome.backend.mqtt.dto.TelemetryPayload;
import com.smarthome.backend.telemetry.dto.TelemetryHistoryPoint;
import com.smarthome.backend.telemetry.dto.TelemetryPointResponse;
import com.smarthome.backend.telemetry.dto.TelemetryStatsResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TelemetryService {

    private static final Logger log = LoggerFactory.getLogger(TelemetryService.class);

    private static final Map<String, Duration> PERIOD_MAP = Map.of(
            "1h",  Duration.ofHours(1),
            "6h",  Duration.ofHours(6),
            "24h", Duration.ofHours(24),
            "7d",  Duration.ofDays(7),
            "30d", Duration.ofDays(30)
    );

    private final TelemetryJdbcRepository telemetryRepo;
    private final DeviceService deviceService;
    private final DeviceRepository deviceRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    private static final Set<String> NON_METRIC_FIELDS =
            Set.of("deviceid", "device_id", "ts", "timestamp", "unit");

    public void ingest(UUID deviceId, String jsonPayload) {
        try {
            JsonNode root = objectMapper.readTree(jsonPayload);
            List<MetricItem> metrics;
            OffsetDateTime time = OffsetDateTime.now();

            if (root.has("metrics") && root.get("metrics").isArray()) {
                TelemetryPayload payload = objectMapper.treeToValue(root, TelemetryPayload.class);
                metrics = payload.metrics();
                if (payload.timestamp() != null) time = payload.timestamp();
            } else {
                metrics = parseFlatJson(root);
            }

            if (metrics == null || metrics.isEmpty()) return;
            telemetryRepo.insertBatch(deviceId, metrics, time);
            broadcastTelemetry(deviceId, metrics, time);
        } catch (Exception e) {
            log.warn("Could not parse telemetry payload for device {}: {}", deviceId, e.getMessage());
        }
    }

    private List<MetricItem> parseFlatJson(JsonNode root) {
        String commonUnit = root.has("unit") ? root.get("unit").asText() : null;
        List<MetricItem> metrics = new ArrayList<>();
        root.fields().forEachRemaining(entry -> {
            if (NON_METRIC_FIELDS.contains(entry.getKey().toLowerCase())) return;
            JsonNode val = entry.getValue();
            if (val.isNumber()) {
                metrics.add(new MetricItem(entry.getKey(), val.doubleValue(), commonUnit));
            } else if (val.isBoolean()) {
                metrics.add(new MetricItem(entry.getKey(), val.asBoolean() ? 1.0 : 0.0, null));
            }
        });
        return metrics;
    }

    public List<TelemetryPointResponse> getLatest(UUID userId, UUID deviceId) {
        deviceService.getById(userId, deviceId);
        return telemetryRepo.findLatestPerMetric(deviceId);
    }

    public List<TelemetryHistoryPoint> getHistory(UUID userId, UUID deviceId,
                                                   String metric,
                                                   OffsetDateTime from, OffsetDateTime to,
                                                   String resolution) {
        deviceService.getById(userId, deviceId);
        return telemetryRepo.findHistory(deviceId, metric, from, to, resolution);
    }

    public TelemetryStatsResponse getStats(UUID userId, UUID deviceId,
                                           String metric, String period) {
        deviceService.getById(userId, deviceId);
        Duration duration = PERIOD_MAP.getOrDefault(period, Duration.ofHours(24));
        OffsetDateTime to = OffsetDateTime.now();
        OffsetDateTime from = to.minus(duration);
        return telemetryRepo.findStats(deviceId, metric, from, to)
                .orElse(new TelemetryStatsResponse(metric, null, null, null, null, 0, from, to));
    }

    private void broadcastTelemetry(UUID deviceId, List<com.smarthome.backend.mqtt.dto.MetricItem> metrics, OffsetDateTime time) {
        deviceRepository.findById(deviceId).ifPresent(device -> {
            UUID userId = device.getUser().getId();
            List<TelemetryPointResponse> points = metrics.stream()
                    .filter(m -> m.name() != null && m.value() != null)
                    .map(m -> new TelemetryPointResponse(m.name(), m.value(), m.unit(), time))
                    .toList();
            messagingTemplate.convertAndSend(
                    "/topic/devices/" + userId + "/" + deviceId + "/telemetry",
                    points
            );
        });
    }
}
