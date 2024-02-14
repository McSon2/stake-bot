import axios from "axios";
import dotenv from "dotenv";
import { getTotalEntriesCount } from "../database/query.js";
dotenv.config();

const TELEGRAM_TOKEN = process.env.TOKENBOTSPORT;
const TELEGRAM_TOKEN2 = process.env.TOKENAUTOBET;

const TELEGRAM_CHANNEL_X = process.env.CHANNELX;
const TELEGRAM_CHANNEL_ID = process.env.CHANNEL;

export async function sendTelegramMessage(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: TELEGRAM_CHANNEL_ID,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendTelegramX(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: TELEGRAM_CHANNEL_X,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function notifyTotalEntriesCountToTelegram() {
  const totalCount = await getTotalEntriesCount();
  if (totalCount !== null) {
    await sendTelegramMessage(
      `Total number of entries in the database: ${totalCount}`
    );
  } else {
    console.error("Error retrieving the total number of entries.");
  }
  setTimeout(notifyTotalEntriesCountToTelegram, 24 * 3600 * 1000); // Toutes les heures
}

export async function sendTelegramPREMIUM(message, chatId) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN2}/sendMessage`;

    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}
