# ADR 0003 : Choix de la base de données pour la télémétrie IoT

**Statut :** Accepté  
**Date :** 2026-05-04  
**Auteurs :** Yvan, Sébastien

## Contexte

La télémétrie IoT est un workload time-series : beaucoup d'écritures séquentielles horodatées, requêtes de type "dernière valeur connue", "historique sur intervalle", agrégats temporels (min, max, avg sur fenêtre glissante). Le choix du stockage a un impact direct sur les performances à l'ingestion et sur la capacité à écrire des requêtes d'analyse.

## Options envisagées

1. **TimescaleDB (extension PostgreSQL)** — base relationnelle avec hypertables partitionnées automatiquement par temps. Fonctions SQL étendues (`time_bucket`, `first`, `last`). Familier pour quiconque connaît PostgreSQL. Supporte les FK vers les tables `devices` et `users`. Même driver JDBC que PostgreSQL.

2. **InfluxDB** — base TSDB native, line protocol propriétaire, Flux query language à apprendre, pas de FK relationnelles, séparation totale du stockage métier.

3. **PostgreSQL standard (sans extension)** — pas de partitionnement automatique, pas de `time_bucket`. Requêtes d'historique correctes mais performances dégradées à volume élevé sans indexation manuelle poussée.

## Décision

**TimescaleDB.** Le projet utilise déjà PostgreSQL pour le modèle relationnel (users, devices, device_types, device_commands). TimescaleDB s'intègre comme une extension : même connexion JDBC, mêmes migrations Liquibase, mêmes outils (pgAdmin, `pg_dump`). La table `telemetry` est déclarée comme hypertable avec partitionnement horaire automatique.

Trade-off :
- **Gain :** pas de second système de stockage, pas de second driver, pas de logique de jointure entre deux bases. Courbe d'apprentissage quasi nulle.
- **Perte :** TimescaleDB ne scale pas aussi bien qu'InfluxDB à très fort volume (> 1M points/sec). Pour notre cas d'usage (dizaines d'appareils), ce n'est pas un facteur discriminant.
- **Conditions pour changer :** si le nombre d'appareils dépasse 10 000 et que l'ingestion devient le goulet d'étranglement mesuré, migrer vers une TSDB dédiée (InfluxDB ou QuestDB) avec une API d'ingestion séparée.

## Conséquences

- **Positives :** un seul système de stockage, une seule connexion, une seule sauvegarde, une seule stack à maintenir.
- **Négatives :** TimescaleDB doit être activé sur l'instance PostgreSQL (`CREATE EXTENSION IF NOT EXISTS timescaledb`). Géré via Liquibase et le `docker-compose.yml`.
- **Risques :** si OVHcloud PostgreSQL managé ne propose pas TimescaleDB, il faudra self-héberger PostgreSQL ou remplacer par InfluxDB Cloud.
- **Réversibilité :** migration vers PostgreSQL standard — supprimer l'hypertable, recréer en table classique. 1 à 2 heures. Migration vers InfluxDB — réécrire la couche d'accès aux données (TelemetryJdbcRepository) : 1 à 2 jours.
