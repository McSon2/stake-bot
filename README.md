# Stake-Bot

[English](README.md#english) | [Français](README.md#français)

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

Le fichier de base de données `sports.db` est disponible au téléchargement via Google Drive : [Télécharger sports.db](https://drive.google.com/uc?export=download&id=1ht5oLoH_fVCDftmtaIULk1Qfq4VhxVKz)

il faut placer sports.db dans /src

## English

[Back to top](README.md#stake-bot)

---

## Configuration

To configure the bot correctly, you must create a `.env` file at the root of your project. This file must contain several essential configuration keys for the bot to function properly. Here's a guide for each variable you need to define:

### API_KEY

`API_KEY` is required to authenticate to the Stake API. You should obtain this key directly from your Stake account or their API documentation.

### COOKIE_STAKE

`COOKIE_STAKE` is used to maintain a session with Stake, especially to bypass Cloudflare protections. You can obtain this value by inspecting the cookies of your browser after logging into Stake.

### TOKENBOTSPORT and TOKENAUTOBET

These tokens are necessary to interact with the Telegram bots. `TOKENBOTSPORT` is used for the sports betting bot, while `TOKENAUTOBET` is for the autobet bot. Obtain these tokens by creating new bots via BotFather on Telegram.

### CHANNELX and CHANNEL

`CHANNELX` and `CHANNEL` represent the identifiers or names of the Telegram channels on which the bot should post updates or information. You can obtain these identifiers by creating channels on Telegram and looking at their URL or using Telegram's development tools.

### VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY

The VAPID keys are used for push notification authentication. You can reuse the same keys generated for `stake-bot-web`. If you don't have keys yet, refer to the "Generate VAPID Keys" section of the `stake-bot-web` README for instructions.

## Example .env file

Create a `.env` file at the root of your project with the following content, replacing the values in parentheses with your own information:

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

## Large File

The `sports.db` database file is available for download via Google Drive: [Download sports.db](https://drive.google.com/uc?export=download&id=1ht5oLoH_fVCDftmtaIULk1Qfq4VhxVKz)

It should be placed in /src.
