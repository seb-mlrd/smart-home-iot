# ADR 0001 : Trade-off vendor lock-in vs vitesse de delivery

**Statut :** Accepté  
**Date :** 2026-05-04  
**Auteurs :** Yvan, Sébastien

## Contexte

Notre projet requiert un broker MQTT managé pour recevoir la télémétrie des objets IoT. Trois options ont été évaluées. La contrainte d'imprévu communiquée en amont impose de répondre au scénario suivant : **le fournisseur principal devient inaccessible dans les 6 mois**. Notre architecture doit donc limiter le couplage aux APIs propriétaires du fournisseur.

Le protocole MQTT est un standard ouvert (OASIS). Le client Eclipse Paho que nous utilisons côté backend est agnostique au broker : seule la configuration `application.yml` (host, port, credentials) change d'un broker à l'autre.

## Options envisagées

1. **HiveMQ Cloud (cluster EU)** — broker MQTT managé, free tier généreux (100 connexions simultanées), cluster hébergé en Europe, MQTT v5, TLS natif. Déploiement en 5 minutes. Dépendance : infrastructure AWS sous-jacente (Cloud Act applicable), entreprise allemande.

2. **Scaleway IoT Hub (fr-par)** — service managé MQTT sur cloud français. Souveraineté native, MQTT v3.1.1 uniquement, moins de documentation, offre moins mature.

3. **Mosquitto self-hosted sur Docker** — broker open-source, zéro lock-in, zéro coût. Charge opérationnelle : gestion TLS, persistance, monitoring, haute disponibilité à assumer entièrement.

## Décision

**HiveMQ Cloud** pour le développement et la démo, avec **Mosquitto self-hosted comme Plan B documenté**.

Justification : la journée de réalisation impose de prioriser la vitesse. HiveMQ Cloud démarre en 5 minutes, supporte MQTT v5 (QoS, shared subscriptions), et le cluster EU réduit la latence. Le couplage reste faible : seul le fichier `application.yml` référence le host HiveMQ.

## Plan de migration (scénario d'imprévu)

Si HiveMQ Cloud devient inaccessible dans 6 mois :

1. Déployer `eclipse-mosquitto` dans un container Docker sur le VPS hébergeant le backend (~30 min).
2. Modifier `application.yml` : changer `mqtt.host`, `mqtt.port`, `mqtt.user`, `mqtt.password`.
3. Configurer TLS avec Let's Encrypt sur le broker self-hosted.
4. Redéployer le backend.

**Estimation : 2 à 4 heures de migration, zéro réécriture de code applicatif.** Le protocole MQTT étant standard, JavaSim et le backend sont transparents au changement de broker.

## Conséquences

- **Positives :** setup immédiat, TLS et clustering gérés, MQTT v5 disponible, dashboard HiveMQ pour debug.
- **Négatives :** données de transit MQTT passent par infrastructure AWS (conflit partiel avec contrainte de souveraineté — voir ADR-002). Free tier plafonné à 100 connexions simultanées.
- **Risques :** indisponibilité HiveMQ coupe l'ingestion temps réel. L'historique TimescaleDB reste accessible ; seule la collecte temps réel est impactée.
- **Réversibilité :** faible couplage (config only). Retour en arrière vers un autre broker : 2 à 4 heures.
