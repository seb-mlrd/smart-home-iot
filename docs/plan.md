# Plan de réalisation — Smart Home IoT

## Découpage des lots

| # | Lot | Responsable | Estimé | Réel | Dépendances | Statut |
|---|---|---|---|---|---|---|
| 1  | Setup repo, Docker, schéma DB (Liquibase)                         | Sébastien | 2h | 3h  | —           | Fait     |
| 2  | Backend : auth JWT (register/login/refresh) + CRUD devices        | Sébastien | 3h | 4h  | Lot 1       | Fait     |
| 3  | Connexion HiveMQ Cloud + ingestion MQTT → TimescaleDB             | Yvan      | 3h | 3h  | Lot 1       | Fait     |
| 4  | Frontend : structure Angular, pages auth, routing                 | Sébastien | 2h | 3h  | Lot 2       | Fait     |
| 5  | Frontend : composants réutilisables, dashboard, device-list       | Sébastien | 3h | 3h  | Lot 4       | Fait     |
| 6  | Backend : WebSocket STOMP + push temps réel                       | Yvan      | 2h | 3h  | Lot 3, 5    | Fait     |
| 7  | Backend : pilotage (device commands + ack via MQTT)               | Yvan      | 2h | 2h  | Lot 3, 6    | Fait     |
| 8  | Backend : catalogue device types + endpoint telemetry stats       | Yvan      | 1h | 1h  | Lot 2       | Fait     |
| 9  | Simulateur JavaSim (multi-appareils, MQTT)                        | Yvan      | 2h | 4h  | Lot 3       | Fait     |
| 10 | Historique & stats (charts time-series, forkJoin, stats cards)    | Yvan      | 2h | 2h  | Lot 8, 9    | Fait     |
| 11 | Corrections comportement simulateur (8 types d'appareils)         | Yvan      | 2h | 3h  | Lot 9       | Fait     |
| 12 | Suppression d'appareil (frontend list + detail, signal in-place)  | Yvan      | 1h | 1h  | Lot 5       | Fait     |
| 13 | Migrations DB capabilities device types (Liquibase 007 + 008)     | Yvan      | 1h | 1h  | Lot 2, 9    | Fait     |
| 14 | WebSocket : correction guards RxStomp (watchDevice/watchStatus)   | Yvan      | 1h | 1h  | Lot 6       | Fait     |
| 15 | Documentation (ADR, architecture, tensions, defense, postmortem)  | Yvan      | 2h | 3h  | Tout        | Fait     |
| 16 | CI GitHub Actions (compile backend + build frontend)              | Sébastien | 1h | 1h  | —           | Fait     |
| 17 | Tests unitaires + E2E chemin critique                             | —         | 2h | —   | —           | Partiel  |

## Chemins critiques

Le lot 3 (ingestion MQTT) bloquait les lots 6 (WebSocket) et 7 (pilotage). Il a été priorisé en premier jour.

Le lot 9 (simulateur) a nécessité des corrections substantielles (lot 11) : parsing des commandes MQTT incorrects pour l'actionneur lumière et volet, dérive température erronée, fuseau horaire CO₂, et thread démon manquant sur la prise connectée.

Le lot 10 (historique) était bloqué par un délai de rafraîchissement de 3h sur la vue matérialisée `telemetry_hourly` — corrigé en utilisant `time_bucket` directement sur la table brute pour la résolution `1h`.

## Ce qui n'a pas été fait (hors-scope assumé)

- **Tests automatisés** : setup du contexte Spring Boot de test + mocking MQTT trop long pour le temps imparti. Chemin critique validé manuellement.
- **Pipeline CI** : GitHub Actions non configuré, priorité donnée à la réalisation fonctionnelle.
- **Déploiement staging** : architecture documentée (OVHcloud) mais non provisionnée.
- **Monitoring RED** : pas de Prometheus/Grafana. Logs applicatifs Spring Boot disponibles.

## Détail des corrections simulateur (lot 11)

| Appareil            | Problème corrigé                                                                 |
|---------------------|---------------------------------------------------------------------------------|
| Capteur température | Dérive bloquée à 25°C — remplacée par un drift proportionnel vers une cible dynamique (±0.05/iter) |
| Actionneur lumière  | Commandes ignorées — parsing `type` + `payload.state` au lieu du champ racine   |
| Actionneur volet    | Commandes ignorées — dispatch sur `type` (open/close/set_position) + `payload.position` |
| Capteur CO₂         | Heure du jour calculée en UTC — corrigé avec `LocalTime.now(LOCAL_ZONE)`        |
| Capteur CO₂         | Amplitude température ambiante trop large (±5°C) — réduite à ±2°C              |
| Prise connectée     | Thread de commande non daemon — ajout `setDaemon(true)` avant `start()`         |
| Tous les actuateurs | Manque de `commandAckTopic` et `telemetryTopic` explicites — ajoutés             |
