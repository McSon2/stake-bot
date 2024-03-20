# Stake-Bot

[French](README-fr.md)

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
