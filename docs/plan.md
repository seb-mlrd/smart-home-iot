# Plan de réalisation — Smart Home IoT

## Découpage des lots

| # | Lot | Responsable | Estimé | Réel | Dépendances | Statut |
|---|---|---|---|---|---|---|
| 1 | Setup repo, Docker, schéma DB (Liquibase) | Sébastien | 2h | 3h | — | Fait |
| 2 | Backend : auth JWT (register/login/refresh) + CRUD devices | Sébastien | 3h | 4h | Lot 1 | Fait |
| 3 | Connexion HiveMQ Cloud + ingestion MQTT → TimescaleDB | Yvan | 3h | 3h | Lot 1 | Fait |
| 4 | Frontend : structure Angular, pages auth, routing | Sébastien | 2h | 3h | Lot 2 | Fait |
| 5 | Frontend : composants réutilisables, dashboard, device-list | Sébastien | 3h | 3h | Lot 4 | Fait |
| 6 | Backend : WebSocket STOMP + push temps réel | Yvan | 2h | 3h | Lot 3, 5 | Fait |
| 7 | Backend : pilotage (device commands + ack via MQTT) | Yvan | 2h | 2h | Lot 3, 6 | Fait |
| 8 | Backend : catalogue device types + endpoint telemetry stats | Yvan | 1h | 1h | Lot 2 | Fait |
| 9 | Simulateur JavaSim (multi-appareils, MQTT) | Yvan | 2h | 2h | Lot 3 | Fait |
| 10 | Documentation (ADR, architecture, tensions, defense) | Yvan | 2h | — | Tout | En cours |
| 11 | CI GitHub Actions (lint + build) | — | 1h | — | — | Non fait |
| 12 | Tests unitaires + E2E chemin critique | — | 2h | — | — | Non fait |

## Chemins critiques

Le lot 3 (ingestion MQTT) bloquait les lots 6 (WebSocket) et 7 (pilotage). Il a été priorisé en premier jour.

## Ce qui n'a pas été fait (hors-scope assumé)

- **Tests automatisés** : setup du contexte Spring Boot de test + mocking MQTT trop long pour le temps imparti. Chemin critique validé manuellement.
- **Pipeline CI** : GitHub Actions non configuré, priorité donnée à la réalisation fonctionnelle.
- **Déploiement staging** : architecture documentée (OVHcloud) mais non provisionnée.
- **Monitoring RED** : pas de Prometheus/Grafana. Logs applicatifs Spring Boot disponibles.
