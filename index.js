import dotenv from "dotenv";
import { checkAPI } from "./src/browser/api/key.js";
import { setBrowserInstance } from "./src/browser/context.js";
import { checkCookies } from "./src/browser/cookies/cookie.js";
import { initializeBrowser } from "./src/browser/initialize.js";
import { processBettingCycle } from "./src/scrap/dataProcessing/betsCycle.js";
import {
  fetchCurrencyRates,
  fetchSportsData,
} from "./src/scrap/fetching/dataFetching.js";
import { startBot, updatefollowUser } from "./src/telegram/autobet.js";
import { notifyTotalEntriesCountToTelegram } from "./src/telegram/messaging.js";
import { updateTopUsersData } from "./src/topUsers/topUsers.js";
dotenv.config();

async function startApp() {
  const browser = await initializeBrowser();
  setBrowserInstance(browser);
  await fetchCurrencyRates();
  startBot();
  await checkAPI();
  await checkCookies();
  await updatefollowUser();
  await updateTopUsersData();
  await notifyTotalEntriesCountToTelegram();
  await Promise.all([fetchSportsData(), processBettingCycle()]);
}

startApp();
