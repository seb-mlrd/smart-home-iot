# Document de défense — Smart Home IoT

## Question 1 : Si HiveMQ Cloud devient inaccessible dans 6 mois, que se passe-t-il ?

L'ingestion temps réel s'arrête : le backend ne reçoit plus de télémétrie. Les données historiques dans TimescaleDB restent accessibles, les APIs REST fonctionnent. La migration vers Mosquitto self-hosted est documentée dans ADR-001 : déployer un container `eclipse-mosquitto`, modifier trois variables d'environnement dans `application.yml` (`mqtt.host`, `mqtt.user`, `mqtt.password`), redéployer le backend. Aucune ligne de code applicatif à changer. Estimation : 2 à 4 heures. Le simulateur JavaSim est également agnostique au broker pour la même raison.

## Question 2 : Comment atteignez-vous 99,999% de disponibilité avec cette architecture ?

Nous ne l'atteignons pas avec le MVP actuel, et nous l'assumons. Un backend single-instance et une base Docker locale ne peuvent pas satisfaire ce SLA. C'est une tension documentée explicitement dans `docs/tensions.md` (tension 5) et dans ADR-002. Pour y répondre en production, il faudrait : backend Spring Boot stateless sur Kubernetes multi-nœuds (le code est déjà stateless, JWT sans session serveur), TimescaleDB en réplication streaming active-passive cross-datacenter, load balancer avec health check, et un RTO < 30 secondes. Cela implique un budget et un provisioning infrastructure hors de portée en une journée.

## Question 3 : HiveMQ Cloud respecte-t-il la souveraineté des données françaises ?

Non entièrement. HiveMQ est une entreprise allemande, mais HiveMQ Cloud s'exécute sur infrastructure AWS. Les données MQTT (télémétrie des appareils) transitent par des serveurs potentiellement soumis au Cloud Act américain. C'est une tension documentée (tensions.md, tension 2, ADR-001). Pour une production conforme à la souveraineté, la solution est Mosquitto self-hosted sur OVHcloud (fr-par) : données de transit restent sur infrastructure française, aucun Cloud Act applicable.

## Question 4 : Si le nombre d'appareils passe de 10 à 10 000 demain, que se passe-t-il ?

Trois goulets d'étranglement à anticiper. (1) L'ingestion MQTT : le backend (MqttService) traite les messages dans le thread Paho. À fort volume, il faudrait un pool de consommateurs ou passer par un bus intermédiaire (Kafka). (2) L'écriture TimescaleDB : TimescaleDB gère bien les insertions batch mais le backend écrit ligne par ligne. Un batch insert ou une queue interne (LinkedBlockingQueue) réduirait la pression. (3) Le WebSocket : 10 000 appareils en push simultané vers le frontend nécessiterait un broker WebSocket dédié (ex: Redis pub/sub + plusieurs instances backend). Le code est stateless, ce qui facilite le scale horizontal du backend.

## Question 5 : Combien coûte votre architecture à la fin du mois ?

En l'état (local Docker) : 0 €. Pour un déploiement OVHcloud production minimal : VPS Discovery (2 vCPU, 2 GB RAM) ~3,50 €/mois pour le backend, PostgreSQL managé Essential (1 nœud) ~14 €/mois, HiveMQ Cloud free tier 0 €. Total : ~17 €/mois. Pour atteindre une haute disponibilité (multi-nœuds K8s + réplication DB) : ~150 à 300 €/mois selon la taille du cluster. Pour atteindre 99,999% avec redondance multi-datacenter : au-delà de 500 €/mois, hors de portée d'un budget de démarrage quasi nul — ce qui rejoint la tension documentée dans ADR-002.
