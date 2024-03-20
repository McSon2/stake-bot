# Stake-Bot

[English](README.md)

## Configuration

Pour configurer correctement le bot, vous devez créer un fichier `.env` à la racine de votre projet. Ce fichier doit contenir plusieurs clés de configuration essentielles pour que le bot fonctionne correctement. Voici un guide pour chaque variable que vous devez définir :

### API_KEY

`API_KEY` est nécessaire pour s'authentifier à l'API de Stake. Vous devriez obtenir cette clé directement depuis votre compte Stake ou leur documentation API.

### COOKIE_STAKE

`COOKIE_STAKE` est utilisé pour maintenir une session avec Stake, notamment pour contourner les protections Cloudflare. Vous pouvez obtenir cette valeur en inspectant les cookies de votre navigateur après vous être connecté à Stake.

### TOKENBOTSPORT et TOKENAUTOBET

Ces tokens sont nécessaires pour interagir avec les bots Telegram. `TOKENBOTSPORT` est utilisé pour le bot qui gère les paris sportifs, tandis que `TOKENAUTOBET` est pour le bot d'autobet. Obtenez ces tokens en créant de nouveaux bots via BotFather sur Telegram.

### CHANNELX et CHANNEL

`CHANNELX` et `CHANNEL` représentent les identifiants ou noms des canaux Telegram sur lesquels le bot doit poster des mises à jour ou des informations. Vous pouvez obtenir ces identifiants en créant des canaux sur Telegram et en regardant leur URL ou en utilisant les outils de développement de Telegram.

### VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY

Les clés VAPID sont utilisées pour l'authentification des notifications push. Vous pouvez réutiliser les mêmes clés que celles générées pour `stake-bot-web`. Si vous n'avez pas encore de clés, référez-vous à la section "Générer des clés VAPID" du README de `stake-bot-web` pour les instructions.

## Exemple de fichier .env

Créez un fichier `.env` à la racine de votre projet avec le contenu suivant, en remplaçant les valeurs entre parenthèses par vos propres informations :

```
API_KEY=(votre api key de stake)
COOKIE_STAKE=(votre cookie cf_bm de stake)
TOKENBOTSPORT=(votre token bot telegram pour les paris sportifs)
TOKENAUTOBET=(votre token bot telegram pour l'autobet)
CHANNELX=(identifiant de votre canal telegram pour les paris odd)
CHANNEL=(identifiant de votre canal telegram principal)
VAPID_PUBLIC_KEY=(votre clé publique VAPID)
VAPID_PRIVATE_KEY=(votre clé privée VAPID)
```

## Fichier volumineux

Le fichier de base de données `sports.db` est disponible au téléchargement via Google Drive : [Télécharger sports.db](https://drive.usercontent.google.com/download?id=1Ab_RbDdpDbGiqFbP6VlLx8TbHP3grGaS&export=download&authuser=0)

il faut placer sports.db dans /src
