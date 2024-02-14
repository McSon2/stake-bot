import dotenv from "dotenv";
import { Scenes, Telegraf, session } from "telegraf";
import dbPromise from "../database/connection.js";
import { topUsersMap } from "../global.js";
import { scenes as apiKeyScenes } from "./apiKeyMenu.js";
import { scenes as userTrackingScenes } from "./userTrackingMenu.js";
dotenv.config();

const token = process.env.TOKENAUTOBET;
const bot = new Telegraf(token);
const { apiKeyMenuScene, addApiKeyScene, editApiKeyScene, myApiKeyScene } =
  apiKeyScenes;
const {
  userTrackingMenuScene,
  followUserScene,
  unfollowUserScene,
  toggleAutoBetScene,
  viewAllScene,
  userStatsScene,
  editUser,
} = userTrackingScenes;

const CHANNEL_ID = process.env.CHANNEL;

// Créer une scène pour le menu principal
const mainMenuScene = new Scenes.BaseScene("MAIN_MENU_SCENE");

mainMenuScene.enter((ctx) => {
  ctx.reply("Welcome to the Autobet bot!", {
    reply_markup: getMainMenuKeyboard(),
  });
});

mainMenuScene.on("text", async (ctx) => {
  const text = ctx.message.text;
  switch (text) {
    case "API Key":
      ctx.scene.enter("API_KEY_SCENE");
      break;
    case "User Tracking":
      ctx.scene.enter("USER_TRACKING_MENU_SCENE");
      break;
    case "Top 20 Profile":
      await displayTopProfilesMessage(ctx, 0);
      break;
    default:
      ctx.reply(
        "I don't understand this command. Please choose an option from the menu.",
        {
          reply_markup: getMainMenuKeyboard(),
        }
      );
      break;
  }
});

// Créer le stage et y ajouter les scènes
export const stage = new Scenes.Stage([
  mainMenuScene,
  apiKeyMenuScene,
  addApiKeyScene,
  editApiKeyScene,
  myApiKeyScene,
  userTrackingMenuScene,
  followUserScene,
  unfollowUserScene,
  toggleAutoBetScene,
  viewAllScene,
  userStatsScene,
  editUser,
]);

// Middleware pour utiliser la session et le stage
bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  try {
    const member = await bot.telegram.getChatMember(CHANNEL_ID, userId);
    if (["member", "administrator", "creator"].includes(member.status)) {
      ctx.scene.leave();
      ctx.scene.enter("MAIN_MENU_SCENE");
    } else {
      ctx.reply(
        "Please subscribe to our VIP channel to access the bot. Subscribe here: [OxaPay VIP Channel](https://t.me/OxaPayCHGBot?start=qVWWsGw)"
      );
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'abonnement :", error);
    ctx.reply(
      "An error occurred while verifying your subscription. Please try again."
    );
  }
});

// Lancer le bot
export function startBot() {
  bot.launch();
}

// Arrêter proprement le bot lorsqu'un signal d'arrêt est reçu
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

//Function

const PAGE_SIZE = 5;

bot.on("callback_query", async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  if (callbackData.startsWith("page_")) {
    const page = parseInt(callbackData.split("_")[1]);
    await editTopProfilesMessage(ctx, page);
  }
});

async function getTopUsers() {
  return Array.from(topUsersMap.values());
}

async function displayTopProfilesMessage(ctx, page) {
  try {
    const topUsers = await getTopUsers();
    const pages = Math.ceil(topUsers.length / PAGE_SIZE);
    const sliceStart = page * PAGE_SIZE;
    const sliceEnd = sliceStart + PAGE_SIZE;
    const currentUsers = topUsers.slice(sliceStart, sliceEnd);

    let message = "Top 20 Profiles:\n";
    currentUsers.forEach((user, index) => {
      let avgBetAmount = parseFloat(user.avg_bet_amount).toFixed(2);
      let avgM = parseFloat(user.avg_potential_multiplier).toFixed(2);
      let avgBetsPerDay = parseFloat(user.avg_bets_per_day).toFixed(2);
      message += `\n__Profile ${sliceStart + index + 1}: __`;
      message += `__${user.user}__\n\n`;
      message += `Total bets: ${user.total_bets}\n`;
      message += `Wins: ${user.wins}\n`;
      message += `Losses: ${user.losses}\n`;
      message += `Ratio: ${user.win_loss_ratio}\n`;
      message += `Profit: ${user.profit}$\n`;
      message += `ROI: ${user.roi}%\n`;
      message += `Average bet: ${avgBetAmount}$\n`;
      message += `Average odds: ${avgM}\n`;
      message += `Avg Bets/Day: ${avgBetsPerDay}\n`;
    });

    const inlineKeyboard = [];

    if (page > 0) {
      inlineKeyboard.push({
        text: "⬅️ Previous",
        callback_data: `page_${page - 1}`,
      });
    }

    if (page < pages - 1) {
      inlineKeyboard.push({
        text: "Next ➡️",
        callback_data: `page_${page + 1}`,
      });
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [inlineKeyboard],
      },
    });
  } catch (error) {
    console.error("Error fetching top profiles:", error);
    ctx.reply(
      "An error occurred while trying to fetch the top profiles. Please try again."
    );
  }
}

async function editTopProfilesMessage(ctx, page) {
  try {
    const topUsers = await getTopUsers();
    const pages = Math.ceil(topUsers.length / PAGE_SIZE);
    const sliceStart = page * PAGE_SIZE;
    const sliceEnd = sliceStart + PAGE_SIZE;
    const currentUsers = topUsers.slice(sliceStart, sliceEnd);

    let message = "Top 20 Profiles:\n";
    currentUsers.forEach((user, index) => {
      let avgBetAmount = parseFloat(user.avg_bet_amount).toFixed(2);
      let avgM = parseFloat(user.avg_potential_multiplier).toFixed(2);
      let avgBetsPerDay = parseFloat(user.avg_bets_per_day).toFixed(2);
      message += `\n*Profile ${sliceStart + index + 1}:*`; // Vous avez utilisé __ mais pour Markdown c'est *
      message += `_${user.user}_\n\n`; // Vous avez utilisé __ mais pour Markdown c'est _
      message += `Total bets: ${user.total_bets}\n`;
      message += `Wins: ${user.wins}\n`;
      message += `Losses: ${user.losses}\n`;
      message += `Ratio: ${user.win_loss_ratio}\n`;
      message += `Profit: ${user.profit}$\n`;
      message += `ROI: ${user.roi}%\n`;
      message += `Average bet: ${avgBetAmount}$\n`;
      message += `Average odds: ${avgM}\n`;
      message += `Avg Bets/Day: ${avgBetsPerDay}\n`;
    });

    const inlineKeyboard = [];

    if (page > 0) {
      inlineKeyboard.push([
        { text: "⬅️ Previous", callback_data: `page_${page - 1}` },
      ]);
    }

    if (page < pages - 1) {
      inlineKeyboard.push([
        { text: "Next ➡️", callback_data: `page_${page + 1}` },
      ]);
    }

    if (
      ctx.callbackQuery &&
      ctx.callbackQuery.message &&
      ctx.callbackQuery.message.message_id
    ) {
      await ctx.telegram.editMessageText(
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
        null,
        message,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        }
      );
    } else {
      console.log("Le message à éditer ne peut pas être trouvé.");
    }
  } catch (error) {
    console.error("Error editing top profiles message:", error);
    ctx.reply(
      "An error occurred while trying to update the top profiles message. Please try again later."
    );
  }
}

function getMainMenuKeyboard() {
  return {
    keyboard: [["API Key", "User Tracking"], ["Top 20 Profile"]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export async function updatefollowUser() {
  const telegramIds = await getActiveUsers();
  for (const telegramId of telegramIds) {
    const isSubscribed = await isUserSubscribed(telegramId);
    await updateUserSubscriptionStatus(telegramId, isSubscribed);
  }

  setTimeout(updatefollowUser, 10 * 60 * 1000);
}

async function isUserSubscribed(userId) {
  try {
    const member = await bot.telegram.getChatMember(CHANNEL_ID, userId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch (error) {
    console.error(
      "Erreur lors de la vérification de l'abonnement pour l'utilisateur " +
        userId,
      error
    );
    return false;
  }
}

async function updateUserSubscriptionStatus(userId, isSubscribed) {
  if (!isSubscribed) {
    const query = `UPDATE user_tracking SET auto_bet_active = 0 WHERE telegram_id = ?`;

    try {
      const db = await dbPromise;
      await db.run(query, userId);
    } catch (error) {
      console.error(
        `Erreur lors de la mise à jour du statut de désabonnement pour ${userId}:`,
        error
      );
    }
  }
}

async function getActiveUsers() {
  const query = `SELECT DISTINCT telegram_id FROM user_tracking WHERE auto_bet_active = 1`;

  try {
    const db = await dbPromise;
    const rows = await db.all(query);
    return rows.map((row) => row.telegram_id);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des utilisateurs actifs :",
      error
    );
    return [];
  }
}
