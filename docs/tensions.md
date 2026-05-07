# Tensions et arbitrages identifiés dans le brief

## Tension 1 : Souveraineté des données vs disponibilité 99,999%

- **Citation du brief :** "Vos contraintes ne sont pas négociables. Elles sont la règle du jeu."
- **Pourquoi c'est une tension :** Les clouds souverains français (OVHcloud, Scaleway) publient des SLA de 99,9% à 99,99% sur leurs services managés, jamais 99,999%. Ce niveau d'uptime requiert une architecture multi-région active-active sur des hyperscalers (AWS, Azure, GCP) dont la SLA atteint 99,99% — mais qui sont soumis au Cloud Act américain, incompatible avec la souveraineté exigée. Les deux contraintes sont structurellement opposées à budget nul.
- **Notre arbitrage :** Nous documentons la tension explicitement (ADR-002) plutôt que de prétendre l'avoir résolue. Pour la démo, l'architecture tourne en local Docker. Pour une mise en production, nous ciblerions OVHcloud multi-datacenter (fr-par + de-fra) avec un SLA cible de 99,99% et documenterions le gap de 0,009% comme limitation connue à adresser avec un budget supérieur.

## Tension 2 : HiveMQ Cloud comme fournisseur principal vs souveraineté

- **Citation du brief :** "votre fournisseur principal devient inaccessible dans les 6 mois" + "Souveraineté des données (France/Europe)"
- **Pourquoi c'est une tension :** HiveMQ est une entreprise allemande, mais HiveMQ Cloud s'exécute sur infrastructure AWS. Les données de télémétrie IoT transitent donc par des serveurs soumis au Cloud Act américain, ce qui contredit directement la contrainte de souveraineté. Nous avons choisi HiveMQ Cloud malgré cela pour la vitesse de setup.
- **Notre arbitrage :** Choix assumé pour le MVP (setup en 5 minutes, MQTT v5, TLS natif), avec un plan de migration documenté vers Mosquitto self-hosted sur OVHcloud qui résoudrait simultanément le problème de souveraineté et la dépendance au fournisseur (ADR-001). Le couplage est volontairement limité : seul `application.yml` référence le broker.

## Tension 3 : "Code production-ready" vs "livrer un MVP rapidement"

- **Citation du brief :** "Vous devez livrer du code production-ready : structuré, testable, lisible, observabilité minimale. Mais vous devez aussi livrer un MVP rapidement, en quelques heures de codage effectif sur la journée."
- **Pourquoi c'est une tension :** "Production-ready" implique des tests automatisés (unitaires + E2E), une CI qui tourne à chaque push, et un monitoring RED en place. Mettre en place tout cela sur une architecture Spring Boot + Angular + MQTT + WebSocket + TimescaleDB en une journée est incompatible avec l'implémentation du périmètre fonctionnel.
- **Notre arbitrage :** Nous avons priorisé la réalisation fonctionnelle (chemin critique bout-en-bout) sur les tests et la CI. Le code est structuré et lisible (packages métier séparés, DTOs, exception handler global), mais il n'y a pas de tests automatisés. Nous l'assumons dans le postmortem.

## Tension 4 : "Démo en staging minimum" vs temps disponible

- **Citation du brief :** "Si vous n'avez pas le temps pour les trois [environnements], faites au moins local + staging, et faites de la staging votre démo."
- **Pourquoi c'est une tension :** Provisionner un environnement staging sur OVHcloud (Kubernetes managé, TimescaleDB managé, DNS, TLS) représente plusieurs heures de configuration infrastructure, sur un projet où la réalisation fonctionnelle était déjà tendue.
- **Notre arbitrage :** Démo en local Docker. L'architecture de staging est documentée (ADR-002, architecture.md) et reproductible via le `docker-compose.yml` existant. C'est une limite honnête, pas une omission.

## Tension 5 : Disponibilité critique vs architecture single-instance du MVP

- **Citation du brief :** "Disponibilité critique (99,999% d'uptime)"
- **Pourquoi c'est une tension :** Notre backend Spring Boot est une seule instance, sans load balancer ni replica. Notre TimescaleDB est un container Docker local sans réplication. Un redémarrage du backend implique une indisponibilité de 30 à 60 secondes — bien au-delà du budget annuel de 5 minutes toléré par un SLA 99,999%.
- **Notre arbitrage :** Le MVP valide le cas d'usage fonctionnel. La haute disponibilité est une propriété de déploiement documentée comme prochaine étape, pas une propriété du code. Le code est stateless (JWT, pas de session en mémoire) : chaque instance peut être scalée horizontalement sans modification.
