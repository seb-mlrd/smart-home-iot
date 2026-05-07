# Postmortem — Smart Home IoT

**Date :** 2026-05-07  
**Auteurs :** Yvan, Sébastien

## Résumé

Le chemin critique (ingestion MQTT → TimescaleDB → WebSocket → frontend) tourne de bout en bout. L'implémentation a pris plus de temps que prévu sur chaque lot, les tests et la CI ont été sacrifiés pour tenir le périmètre fonctionnel.

## Ce qui a marché

- La séparation backend / frontend dès le départ a permis un travail parallèle efficace sur 3 jours.
- Le choix de TimescaleDB comme extension PostgreSQL a évité d'apprendre une nouvelle base : un seul driver, une seule connexion, des migrations Liquibase identiques.
- HiveMQ Cloud a fonctionné immédiatement sans configuration TLS complexe.
- Le simulateur JavaSim a rendu la démo indépendante d'un hardware physique.

## Ce qui n'a pas marché

- L'intégration WebSocket STOMP avec Spring Security a nécessité un `JwtHandshakeInterceptor` non prévu initialement : 2 heures perdues sur le debug d'authentification WebSocket.
- Aucun test automatisé. Le manque de tests a rendu chaque refactoring risqué.
- La documentation a été rédigée après le code au lieu d'être co-construite. Les ADRs auraient dû être écrits avant le premier commit.

## Surprise notable

L'upgrade Paho MQTT v5 côté JavaSim a causé des incompatibilités de sérialisation avec le backend qui attendait v3.1.1. Résolu en alignant les deux sur MQTT v5 et en normalisant le format JSON du payload.

## Ce qu'on referait différemment

- Écrire ADR-001 et ADR-002 le premier matin, avant le premier commit.
- Ajouter 2 tests d'intégration Spring Boot dès la mise en place du CRUD (démarrage API + auth refusée sans token).
- Configurer GitHub Actions le premier jour plutôt que de le laisser pour la fin.
