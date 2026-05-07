# Architecture — Smart Home IoT

## Contraintes initiales

- **Souveraineté des données (France/Europe)** : les données des utilisateurs et la télémétrie des appareils ne doivent pas transiter par des infrastructures soumises au Cloud Act américain.
- **Disponibilité critique (99,999%)** : la plateforme doit rester accessible en permanence ; une indisponibilité de plus de 5 minutes par an est hors SLA.

## Stack et versions

| Couche | Technologie | Version |
|---|---|---|
| Frontend | Angular + Angular Material + RxStomp | 19.x |
| Backend | Spring Boot + Spring Security | 3.2.5 (Java 21) |
| Base de données | TimescaleDB (extension PostgreSQL) | PostgreSQL 15 |
| Migrations | Liquibase | 4.x |
| Broker MQTT | HiveMQ Cloud (cluster EU) | MQTT v5 |
| Temps réel frontend | WebSocket STOMP (`SimpMessagingTemplate`) | — |
| Simulateur | JavaSim (Maven Exec) | Java 21 |
| Conteneurs local | Docker Compose | — |

## Schéma d'architecture

```
┌─────────────────────────────────────────────────────┐
│                    Utilisateur                       │
│               (navigateur :4200)                     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST + WebSocket STOMP
                       ▼
┌─────────────────────────────────────────────────────┐
│              Backend Spring Boot :8081               │
│  ┌───────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ Auth JWT  │ │ Device API   │ │ Telemetry API   │ │
│  └───────────┘ └──────────────┘ └─────────────────┘ │
│  ┌──────────────────────────────────────────────────┐│
│  │          MqttService (Eclipse Paho)              ││
│  │  subscribe: smarthome/{userId}/{deviceId}/+      ││
│  └──────────────────────────────────────────────────┘│
└────────────┬────────────────────────┬────────────────┘
             │ JDBC (Liquibase)        │ MQTT TLS :8883
             ▼                         ▼
┌─────────────────────┐  ┌──────────────────────────────┐
│  TimescaleDB :5433  │  │     HiveMQ Cloud (EU)        │
│  (Docker local)     │  │  (broker MQTT managé)        │
└─────────────────────┘  └──────────────────┬───────────┘
                                            │ MQTT TLS :8883
                                            ▼
                              ┌──────────────────────────┐
                              │  JavaSim (simulateur)    │
                              │  publie télémétrie fictive│
                              └──────────────────────────┘
```

**Flux principal (story critique) :**

1. JavaSim publie un message MQTT sur `smarthome/{userId}/{deviceId}/telemetry`
2. HiveMQ Cloud reçoit et route le message
3. Le backend (MqttService) reçoit le message, le désérialise, le persiste en TimescaleDB
4. Le backend pousse la mise à jour via WebSocket STOMP vers les clients connectés
5. Le frontend Angular (RxStomp) reçoit l'événement et met à jour le dashboard en temps réel

## Modèle de données (schéma logique)

```
users
  id (UUID PK)
  email (unique)
  password_hash (bcrypt)
  created_at

device_types
  id (UUID PK)
  name (thermostat, lux_sensor, …)

devices
  id (UUID PK)
  user_id (FK → users)
  device_type_id (FK → device_types)
  name
  status (ONLINE / OFFLINE)
  created_at

telemetry (hypertable TimescaleDB, partitionnée par time)
  id (UUID PK)
  device_id (FK → devices)
  metric_key
  metric_value
  time (timestamp with time zone)

device_commands
  id (UUID PK)
  device_id (FK → devices)
  command_type
  payload (JSON)
  status (PENDING / SENT / ACK / FAILED)
  created_at
```

## Stratégie de scalabilité

L'architecture actuelle est **verticale** (single instance backend + single DB). Le goulet d'étranglement attendu est le backend sur l'ingestion MQTT à fort volume.

Évolution prévue : scale horizontal du backend (stateless, JWT), ajout d'un pool de connexions (HikariCP déjà inclus dans Spring Boot), et activation des politiques de rétention TimescaleDB pour limiter la croissance du disque.

## Stratégie de sauvegarde

- **RPO cible** : 1 heure (dump horaire TimescaleDB)
- **RTO cible** : 4 heures (restauration depuis dump + redémarrage des services)
- Sauvegarde : `pg_dump` planifié, stocké dans une région différente du provider principal

## Considérations de sécurité

- Authentification JWT avec access token (15 min) + refresh token (7 jours) en base
- Mots de passe hashés bcrypt
- WebSocket STOMP protégé par `JwtHandshakeInterceptor`
- Secrets hors git (`.env` + `.env.example`)
- CORS restreint à `localhost:4200` en développement

## Limitations connues (choix conscients)

- Pas de déploiement cloud : la démo se fait en local. Une architecture de staging est documentée mais non déployée.
- HiveMQ Cloud héberge les données de transit MQTT sur infrastructure AWS : tension documentée dans [ADR-001](adr/0001-vendor-lockin.md) et [ADR-002](adr/0002-disponibilite-souverainete.md).
- Pas de tests automatisés : coût de setup trop élevé pour le temps imparti. Chemin critique vérifié manuellement.
- Disponibilité 99,999% non atteignable avec une architecture single-instance : voir ADR-002.
