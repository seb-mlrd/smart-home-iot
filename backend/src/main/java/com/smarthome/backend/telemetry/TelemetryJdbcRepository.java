package com.smarthome.backend.telemetry;

import com.smarthome.backend.mqtt.dto.MetricItem;
import com.smarthome.backend.telemetry.dto.TelemetryHistoryPoint;
import com.smarthome.backend.telemetry.dto.TelemetryPointResponse;
import com.smarthome.backend.telemetry.dto.TelemetryStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class TelemetryJdbcRepository {

    private final NamedParameterJdbcTemplate jdbc;

    void insertBatch(UUID deviceId, List<MetricItem> metrics, OffsetDateTime time) {
        String sql = """
                INSERT INTO telemetry (time, device_id, metric, value, unit)
                VALUES (:time, :deviceId, :metric, :value, :unit)
                """;
        MapSqlParameterSource[] batch = metrics.stream()
                .filter(m -> m.name() != null && m.value() != null)
                .map(m -> new MapSqlParameterSource()
                        .addValue("time", Timestamp.from(time.toInstant()))
                        .addValue("deviceId", deviceId)
                        .addValue("metric", m.name())
                        .addValue("value", m.value())
                        .addValue("unit", m.unit()))
                .toArray(MapSqlParameterSource[]::new);
        if (batch.length > 0) {
            jdbc.batchUpdate(sql, batch);
        }
    }

    List<TelemetryPointResponse> findLatestPerMetric(UUID deviceId) {
        String sql = """
                SELECT DISTINCT ON (metric) time, metric, value, unit
                FROM telemetry
                WHERE device_id = :deviceId
                ORDER BY metric, time DESC
                """;
        return jdbc.query(sql,
                new MapSqlParameterSource("deviceId", deviceId),
                (rs, i) -> new TelemetryPointResponse(
                        rs.getString("metric"),
                        rs.getDouble("value"),
                        rs.getString("unit"),
                        toOffsetDateTime(rs.getTimestamp("time"))
                ));
    }

    List<TelemetryHistoryPoint> findHistory(UUID deviceId, String metric,
                                            OffsetDateTime from, OffsetDateTime to,
                                            String resolution) {
        return switch (resolution) {
            case "5m" -> findHistoryAggregated(deviceId, metric, from, to, "5 minutes");
            case "1h" -> findHistoryAggregated(deviceId, metric, from, to, "1 hour");
            case "1d" -> findHistoryAggregated(deviceId, metric, from, to, "1 day");
            default   -> findHistoryRaw(deviceId, metric, from, to);
        };
    }

    Optional<TelemetryStatsResponse> findStats(UUID deviceId, String metric,
                                               OffsetDateTime from, OffsetDateTime to) {
        String sql = """
                SELECT MIN(value) AS min, MAX(value) AS max, AVG(value) AS avg, COUNT(*) AS cnt
                FROM telemetry
                WHERE device_id = :deviceId AND metric = :metric
                  AND time >= :from AND time <= :to
                """;
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("deviceId", deviceId)
                .addValue("metric", metric)
                .addValue("from", Timestamp.from(from.toInstant()))
                .addValue("to", Timestamp.from(to.toInstant()));

        return jdbc.query(sql, params, rs -> {
            if (!rs.next()) return Optional.empty();
            long count = rs.getLong("cnt");
            if (count == 0) return Optional.empty();
            double min = rs.getDouble("min");
            double max = rs.getDouble("max");
            double avg = rs.getDouble("avg");
            Double last = findLastValue(deviceId, metric, to);
            return Optional.of(new TelemetryStatsResponse(metric, min, max, avg, last, count, from, to));
        });
    }

    private List<TelemetryHistoryPoint> findHistoryRaw(UUID deviceId, String metric,
                                                       OffsetDateTime from, OffsetDateTime to) {
        String sql = """
                SELECT time, value, unit
                FROM telemetry
                WHERE device_id = :deviceId AND metric = :metric
                  AND time >= :from AND time <= :to
                ORDER BY time ASC
                """;
        return jdbc.query(sql, historyParams(deviceId, metric, from, to),
                (rs, i) -> new TelemetryHistoryPoint(
                        toOffsetDateTime(rs.getTimestamp("time")),
                        rs.getDouble("value"),
                        rs.getString("unit"),
                        null,
                        null
                ));
    }

    private List<TelemetryHistoryPoint> findHistoryAggregated(UUID deviceId, String metric,
                                                              OffsetDateTime from, OffsetDateTime to,
                                                              String bucketSize) {
        String sql = String.format("""
                SELECT time_bucket('%s', time) AS bucket,
                       AVG(value) AS avg_val,
                       MIN(value) AS min_val,
                       MAX(value) AS max_val
                FROM telemetry
                WHERE device_id = :deviceId AND metric = :metric
                  AND time >= :from AND time <= :to
                GROUP BY bucket
                ORDER BY bucket ASC
                """, bucketSize);
        return jdbc.query(sql, historyParams(deviceId, metric, from, to),
                (rs, i) -> new TelemetryHistoryPoint(
                        toOffsetDateTime(rs.getTimestamp("bucket")),
                        rs.getDouble("avg_val"),
                        null,
                        rs.getDouble("min_val"),
                        rs.getDouble("max_val")
                ));
    }

    private List<TelemetryHistoryPoint> findHistoryHourly(UUID deviceId, String metric,
                                                          OffsetDateTime from, OffsetDateTime to) {
        String sql = """
                SELECT bucket, avg_value, min_value, max_value
                FROM telemetry_hourly
                WHERE device_id = :deviceId AND metric = :metric
                  AND bucket >= :from AND bucket <= :to
                ORDER BY bucket ASC
                """;
        return jdbc.query(sql, historyParams(deviceId, metric, from, to),
                (rs, i) -> new TelemetryHistoryPoint(
                        toOffsetDateTime(rs.getTimestamp("bucket")),
                        rs.getDouble("avg_value"),
                        null,
                        rs.getDouble("min_value"),
                        rs.getDouble("max_value")
                ));
    }

    private Double findLastValue(UUID deviceId, String metric, OffsetDateTime before) {
        String sql = """
                SELECT value FROM telemetry
                WHERE device_id = :deviceId AND metric = :metric AND time <= :before
                ORDER BY time DESC LIMIT 1
                """;
        List<Double> result = jdbc.query(sql,
                new MapSqlParameterSource()
                        .addValue("deviceId", deviceId)
                        .addValue("metric", metric)
                        .addValue("before", Timestamp.from(before.toInstant())),
                (rs, i) -> rs.getDouble("value"));
        return result.isEmpty() ? null : result.get(0);
    }

    private MapSqlParameterSource historyParams(UUID deviceId, String metric,
                                                OffsetDateTime from, OffsetDateTime to) {
        return new MapSqlParameterSource()
                .addValue("deviceId", deviceId)
                .addValue("metric", metric)
                .addValue("from", Timestamp.from(from.toInstant()))
                .addValue("to", Timestamp.from(to.toInstant()));
    }

    private OffsetDateTime toOffsetDateTime(Timestamp ts) {
        return ts == null ? null : ts.toInstant().atOffset(ZoneOffset.UTC);
    }
}
