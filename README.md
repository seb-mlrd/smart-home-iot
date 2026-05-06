# Smart Home IoT

Plateforme de gestion d'objets connectés en temps réel. Un backend Spring Boot ingère la télémétrie MQTT de vos appareils, la persiste dans TimescaleDB et la pousse en direct vers un frontend Angular via WebSocket STOMP.

## Stack technique

| Couche | Technologie |
| --- | --- |
| Frontend | Angular 19 · Angular Material · RxStomp |
| Backend | Spring Boot 3.2.5 · Java 21 · Spring Security (JWT) |
| Base de données | TimescaleDB (PostgreSQL 15) · Liquibase |
| Messagerie | HiveMQ Cloud (MQTT v5) |
| Temps réel | WebSocket STOMP (`SimpMessagingTemplate`) |
| Simulateur | JavaSim (Java · Maven Exec) |

---

## Architecture

```text
[JavaSim]
    │  MQTT telemetry / status / command/ack
    ▼
[HiveMQ Cloud]
    │
    ▼
[Backend :8081]  ──── REST API ────►  [Frontend :4200]
    │   JWT auth · Liquibase              Angular 19
    │   TimescaleDB                       Angular Material
    │
    └── WebSocket STOMP (/ws) ──────►  temps réel (statut, télémétrie)
```

---

## Prérequis

- **Docker Desktop** (pour TimescaleDB + pgAdmin)
- **Java 21+** (backend + simulateur)
- **Node.js 20+** (frontend)
- Un compte **HiveMQ Cloud** (broker MQTT gratuit sur <https://www.hivemq.com/mqtt-cloud-broker/>)

---

## Démarrage rapide

### 1. Base de données

```bash
cd docker
docker compose up -d
```

Démarre TimescaleDB sur le port **5434** et pgAdmin sur <http://localhost:5050>.  
Liquibase crée et migre le schéma automatiquement au premier démarrage du backend.

### 2. Backend

```bash
cd backend
./mvnw.cmd spring-boot:run   # Windows
./mvnw spring-boot:run       # Linux / macOS
```

Le backend écoute sur <http://localhost:8081>.  
Les variables d'environnement suivantes peuvent être surchargées (valeurs par défaut suffisantes en local) :

| Variable | Défaut | Description |
| --- | --- | --- |
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5433` | Port PostgreSQL (5434 côté Docker, mappé 5433 dans l'app) |
| `MQTT_HOST` | `localhost` | Hôte MQTT |
| `MQTT_PORT` | `8883` | Port MQTT (TLS) |
| `MQTT_USER` | _(vide)_ | Identifiant HiveMQ |
| `MQTT_PASSWORD` | _(vide)_ | Mot de passe HiveMQ |
| `JWT_SECRET` | `change-me-in-production-…` | Clé de signature JWT (≥ 256 bits) |

> Pour HiveMQ Cloud, renseignez `MQTT_HOST`, `MQTT_USER` et `MQTT_PASSWORD` selon votre cluster.

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Application disponible sur <http://localhost:4200>.

### 4. Simulateur (optionnel)

Le simulateur publie de la télémétrie fictive via MQTT pour tester sans vrai hardware.

1. Créez votre compte via le frontend (`/auth/register`) ou Postman (`POST /api/v1/auth/register`)
1. Créez vos appareils (frontend ou Postman `POST /api/v1/devices`) et relevez leurs UUID
1. Récupérez votre `userId` depuis pgAdmin (`SELECT id FROM users`) ou depuis le JWT décodé
1. Renseignez les UUID dans [`JavaSim/src/main/resources/config.yml`](JavaSim/src/main/resources/config.yml)

```yaml
# JavaSim/src/main/resources/config.yml
broker:
  host: <votre-cluster>.hivemq.cloud
  port: 8883
  user: <mqtt-user>
  password: <mqtt-password>

user_id: <votre-userId-UUID>

devices:
  - id: <uuid-device-1>
    type: thermostat
    interval_ms: 5000
  # ...
```

1. Lancez le simulateur :

```bash
cd JavaSim
./mvnw.cmd exec:java   # Windows
./mvnw exec:java       # Linux / macOS
```

---

## Types d'appareils supportés

| Type | Métriques publiées | Commandes disponibles |
| --- | --- | --- |
| `thermostat` | `temperature`, `humidity`, `setpoint` | `set_temperature` |
| `temperature_sensor` | `temperature`, `humidity` | — |
| `lux_sensor` | `lux` | — |
| `light_actuator` | `state`, `brightness` | `turn_on`, `turn_off`, `set_brightness` |
| `shutter_actuator` | `position`, `state` | `open`, `close`, `set_position` |
| `smart_plug` | `state`, `power_w`, `energy_kwh` | `turn_on`, `turn_off` |
| `co2_sensor` | `co2_ppm`, `temperature` | — |
| `motion_detector` | `motion`, `lux` | — |

---

## API REST — principales routes

```text
# Auth
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# Appareils
GET    /api/v1/devices
POST   /api/v1/devices
GET    /api/v1/devices/:id
PUT    /api/v1/devices/:id
DELETE /api/v1/devices/:id

# Catalogue types
GET    /api/v1/device-types

# Télémétrie
GET    /api/v1/devices/:id/telemetry/latest
GET    /api/v1/devices/:id/telemetry/history

# Commandes
POST   /api/v1/devices/:id/commands
GET    /api/v1/devices/:id/commands
```

Toutes les routes (hors `/auth`) nécessitent le header `Authorization: Bearer <accessToken>`.

---

## pgAdmin

Accès : <http://localhost:5050>  
Login : `admin@smarthome.dev` / `admin`

Pour connecter le serveur :

- **Host** : `timescaledb` (nom du container Docker)
- **Port** : `5432`
- **Maintenance database** : `smarthome`
- **Username / Password** : `smarthome` / `smarthome`

---

## Structure du projet

```text
smart-home-iot/
├── backend/          # Spring Boot — API REST + MQTT + WebSocket
├── frontend/         # Angular 19 — dashboard temps réel
├── JavaSim/          # Simulateur d'appareils IoT
└── docker/           # docker-compose (TimescaleDB + pgAdmin)
```
