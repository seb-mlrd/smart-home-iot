# SmartHome IoT Simulator

Simulateur d'objets connectés en Java utilisant MQTT (HiveMQ Broker).

## Démarrage rapide

Ce projet utilise **Maven Wrapper** (`mvnw.cmd` sur Windows). Aucune installation préalable de Maven n'est nécessaire.

### Lancer le simulateur

```bash
mvnw.cmd exec:java
```

### Avec un broker MQTT personnalisé

```bash
mvnw.cmd exec:java -Dexec.args="broker.example.com"
```

Par défaut, le simulateur se connecte à `broker.hivemq.com:1883`.

## Fonctionnalités

Le simulateur lance 4 objets connectés en parallèle :

- **Capteur Température** : publie toutes les 5 secondes sur `smarthome/salon/temp`
  - Valeur : 18.0 à 25.0 °C
  - Format JSON : `{"value": 20.5, "unit": "C", "timestamp": 1651234567890}`

- **Capteur Luminosité** : publie toutes les 3 secondes sur `smarthome/salon/lux`
  - Valeur : 100 à 1000 lux
  - Format JSON : `{"value": 500, "unit": "lux", "timestamp": 1651234567890}`

- **Actionneur Lumière** : s'abonne à `smarthome/salon/light`
  - Commande : `{"state": "ON"}` ou `{"state": "OFF"}`
  - Affichage : `[LIGHT] LUMIERE : ON` ou `[LIGHT] LUMIERE : OFF`

- **Actionneur Volet** : s'abonne à `smarthome/chambre/shutter`
  - Commande : `{"position": 50}` ou simplement `50`
  - Affichage : `[SHUTTER] Position volet: 50%`

## Compilation et exécution

### Compiler uniquement

```bash
mvnw.cmd compile
```

### Exécuter les tests

```bash
mvnw.cmd test
```

### Créer un JAR autonome

```bash
mvnw.cmd clean package
java -jar target/java-sim-1.0.0.jar
```

## Architecture

- **API Bloquante HiveMQ** : Utilise `Mqtt5BlockingClient` pour une logique simple et synchrone
- **Records Java** : Messages structurés en JSON via les records `TemperatureMessage`, `LuxMessage`, `LightCommand`, `ShutterCommand`
- **Threading** : 4 threads séparés (1 par objet connecté) pour une exécution autonome

## Dépendances

- `com.hivemq:hivemq-mqtt-client:1.3.0` - Client MQTT HiveMQ
- `com.fasterxml.jackson.core:jackson-databind:2.17.2` - Sérialisation/désérialisation JSON
- Java 17+

## Notes

- Les logs console affichent l'état en temps réel de chaque objet (PREFIX : [TEMP], [LUX], [LIGHT], [SHUTTER])
- Le format de logs facilite le suivi des publications et réceptions MQTT
- Les threads continueront indéfiniment jusqu'à Ctrl+C

## Troubleshooting

Si le premier lancement prend du temps, c'est que Maven Wrapper télécharge les dépendances. C'est normal.

Si vous avez une erreur de connexion au broker MQTT :
1. Vérifiez la connectivité réseau
2. Testez que le broker est accessible sur le port 1883
3. Essayez avec un broker public comme `broker.hivemq.com`
