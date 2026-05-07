# ADR 0002 : Réponse aux contraintes de souveraineté et de disponibilité critique

**Statut :** Accepté (avec arbitrage explicite)  
**Date :** 2026-05-04  
**Auteurs :** Yvan, Sébastien

## Contexte

Nos deux contraintes imposées sont :

- **Souveraineté des données (France/Europe)** : les données utilisateurs et la télémétrie ne doivent pas être soumises à une juridiction extra-européenne (Cloud Act américain).
- **Disponibilité critique (99,999%)** : soit moins de 5 minutes d'indisponibilité par an. Ce niveau requiert une architecture multi-région active-active ou active-passive avec bascule automatique sub-minute.

Ces deux contraintes sont **en tension directe** : les providers cloud souverains français (OVHcloud Public Cloud, Scaleway) publient des SLA de 99,9% à 99,99% selon les services, jamais 99,999%. Atteindre 99,999% sur infrastructure souveraine française est aujourd'hui hors de portée avec un budget de démarrage quasi nul.

## Options envisagées

1. **OVHcloud (fr-par) + multi-AZ** — souveraineté native, SLA PostgreSQL managé 99,95%, Kubernetes managé 99,9%. 99,999% non atteignable sans architecture multi-région coûteuse.

2. **AWS (eu-west-3 Paris) + RDS Multi-AZ** — SLA 99,99% sur EC2, 99,95% sur RDS. Pas souverain (Cloud Act applicable). Approche la plus simple pour atteindre 99,99%.

3. **Architecture hybride OVHcloud + Scaleway** — active-passive cross-provider pour atteindre 99,999% via réplication. Complexité opérationnelle élevée, hors de portée en une journée.

4. **Local Docker uniquement (MVP)** — aucune SLA, démo validée fonctionnellement. Honnêteté sur les limites.

## Décision

**Option 4 pour le MVP de démonstration**, avec documentation de l'option 1 (OVHcloud) comme cible de production.

L'arbitrage est le suivant : **la contrainte 99,999% est irréaliste à budget nul avec une contrainte de souveraineté simultanée.** Nous assumons cet arbitrage explicitement plutôt que de prétendre l'avoir résolu.

Pour un déploiement de production réel, nous choisirions :
- **OVHcloud Public Cloud** (fr-par) pour le backend et TimescaleDB managé → souveraineté assurée
- **Replication streaming PostgreSQL** cross-datacenter OVHcloud (fr-par + de-fra) → RTO < 1 min, SLA cible ~99,99%
- **Mosquitto self-hosted** sur le même cluster OVHcloud → plus de dépendance HiveMQ Cloud

Le gap de 99,999% vs 99,99% est documenté comme limitation connue à adresser avec un budget supérieur (load balancer anycast, multi-région active-active).

## Conséquences

- **Positives :** choix honnête, architecture cible cohérente avec les contraintes, pas de surcoût fictif.
- **Négatives :** la démo ne valide pas la disponibilité 99,999%. L'ingestion MQTT via HiveMQ Cloud reste une violation partielle de la souveraineté (données en transit sur AWS).
- **Risques :** si le sujet est évalué sur la mise en œuvre réelle de 99,999%, le projet ne satisfait pas la contrainte.
- **Réversibilité :** migration vers OVHcloud estimée à 1 à 2 semaines de travail (provisioning K8s, migration TimescaleDB, reconfiguration MQTT).
