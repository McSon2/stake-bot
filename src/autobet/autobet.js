import { fetchBetDetailsWithStatus } from "../scrap/fetching/dataFetching.js";
import { getPageFromPool, returnPageToPool } from "../browser/pagePool.js";
import fs from "fs";
import path from "path";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dbPromise from "../database/connection.js";
import { conversionRatesUSD } from "../global.js";
import { sendTelegramPREMIUM } from "../telegram/messaging.js";
import { sendCustomNotification } from "../../../BOTWebSQLite/notification.js";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, "../userstatsdashboard.db");

async function openDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

const PLACE_BET = fs.readFileSync(path.join(__dirname, "..", "queries", "placeBet.graphql"), "utf8");
const PLACE_BET_Alt = fs.readFileSync(path.join(__dirname, "..", "queries", "placeBetAlt.graphql"), "utf8");
const FETCH_ID = fs.readFileSync(path.join(__dirname, "..", "queries", "fetchIID.graphql"), "utf8");

export async function betDetails(bet, followersData) {
  const response = await fetchBetDetailsWithStatus(bet.iid);
  const userStats = await getUserStats(bet.user);
  if (response && response.data && response.data.bet && response.data.bet.bet && response.data.bet.bet.outcomes) {
    const outcomeIds = response.data.bet.bet.outcomes.map((outcome) => outcome.outcome.id);
    const betAmountUser = bet.amount;
    const betType = response.data.bet.bet.outcomes.some((outcome) => outcome.__typename === "EsportFixtureEventStatus")
      ? "esports"
      : "sports";

    const betPromises = followersData.map((follower) => {
      let betAmountUSD;
      if (follower.variable_bet === "Y") {
        if (userStats && userStats.avg_bet_amount) {
          betAmountUSD = (betAmountUser / userStats.avg_bet_amount) * follower.bet_amount;
          betAmountUSD = Math.min(betAmountUSD, follower.max_bet_amount);
        } else {
          betAmountUSD = follower.bet_amount;
        }
      } else {
        betAmountUSD = follower.bet_amount;
      }

      const currency = follower.currency;
      const conversionRate = conversionRatesUSD[currency] || 1;
      const betAmount = betAmountUSD / conversionRate;

      const apiKey = follower.api_key;

      return placeBet(outcomeIds, betAmount, follower.currency, apiKey, betType).then((result) => {
        console.log("autobet telegramid:", follower.telegram_id, "result:", result);
        sendTrackedUserMessage(
          bet,
          follower,
          betAmountUSD,
          bet.iid,
          result.response.success,
          result.response.message,
          result.response.iid
        );
        return result;
      });
    });

    try {
      const results = await Promise.all(betPromises);
    } catch (error) {
      console.error("Erreur lors du placement des paris:", error.message, results);
    }
  } else {
    console.error("Format de données inattendu ou données manquantes");
  }
}

async function placeBet(outcomeIds, betAmount, currency, apiKey, betType) {
  const placeBetVars = {
    amount: betAmount,
    currency: currency,
    betType: betType,
    oddsChange: "any",
    outcomeIds: outcomeIds,
  };

  const placeBetVarsAlt = {
    amount: betAmount,
    currency: currency,
    oddsChange: "any",
    outcomeIds: outcomeIds,
  };

  try {
    let response = await tryPlacingBet(apiKey, placeBetVars);
    if (!response.success) {
      if (response.message === "type.outcome cannot be found or is unavailable.") {
        // Changer le type de pari en "esports" et réessayer
        placeBetVars.betType = "esports";
        response = await tryPlacingBet(apiKey, placeBetVars);
      } else if (response.message === "Multi bet cannot contain multiple markets from same event") {
        response = await tryPlacingBetAlt(apiKey, placeBetVarsAlt);
      } else if (shouldRetry(response.message)) {
        response = await tryPlacingBet(apiKey, placeBetVars);
      }
    }
    return { response };
  } catch (error) {
    if (error.message.includes("Navigation timeout of 10000 ms exceeded")) {
      return { success: true, message: "Successfully placed bet" };
    }
    console.error("Error placing bet:", error.message, response);
    return { success: false, message: error.message };
  }
}

function shouldRetry(message) {
  return message === "type.outcome cannot be found or is unavailable." || message === "Market is not active.";
}

async function tryPlacingBet(apiKey, placeBetVars) {
  const response = await fetchAndClose("https://stake.bet/_api/graphql", apiKey, {
    query: PLACE_BET,
    variables: placeBetVars,
  });
  return await processApiResponse(response, apiKey);
}

async function tryPlacingBetAlt(apiKey, placeBetVars) {
  const response = await fetchAndClose("https://stake.bet/_api/graphql", apiKey, {
    query: PLACE_BET_Alt,
    variables: placeBetVars,
  });
  return await processApiResponse(response, apiKey);
}

async function processApiResponse(response, apiKey) {
  const id = response?.data?.sportBet?.id;

  if (response && response.errors) {
    const errorMessage = response ? response.errors[0].message : "Navigation timeout of 10000 ms exceeded";
    if (errorMessage.includes("Navigation timeout of 10000 ms exceeded")) {
      let iid = await fetchiid(apiKey, id);
      return { success: true, message: "Successfully placed bet", iid: iid };
    }
    return { success: false, message: errorMessage };
  }

  if (response.data && response.data.sportBet) {
    let iid = await fetchiid(apiKey, id);
    return { success: true, message: "Successfully placed bet", iid: iid };
  }

  return { success: false, message: "Unexpected error when placing a bet" };
}

async function fetchiid(apiKey, id) {
  const response = await fetchAndClose("https://stake.bet/_api/graphql", apiKey, {
    query: FETCH_ID,
    variables: { limit: 5, offset: 0 },
  });

  if (response && response.data && response.data.user && response.data.user.activeSportBets) {
    const bets = response.data.user.activeSportBets;

    const betWithId = bets.find((bet) => bet.id === id);

    return betWithId ? betWithId.bet.iid : null;
  }

  return null;
}

async function fetchAndClose(url, apiKey, requestData) {
  const page = await getPageFromPool();
  const HEADERS = {
    accept: "*/*",
    "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    "content-type": "application/json",
    Cookie: "__cf_bm=" + process.env.COOKIE_STAKE,
    origin: "https://stake.bet",
    pragma: "no-cache",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "x-access-token": apiKey,
  };

  try {
    await page.setRequestInterception(true);
    page.once("request", (interceptedRequest) => {
      interceptedRequest.continue({
        method: "POST",
        postData: JSON.stringify(requestData),
        headers: { ...interceptedRequest.headers(), ...HEADERS },
      });
    });

    const response = await page.goto(url, {
      timeout: 10000,
      waitUntil: ["domcontentloaded", "load"],
    });
    await page.waitForTimeout(10000);
    const data = await response.text();
    returnPageToPool(page);

    return JSON.parse(data);
  } catch (error) {
    await page.close();
    throw error;
  }
}

async function getUserStats(username) {
  try {
    const db = await dbPromise;
    const query = `
      SELECT 
      user,
      COUNT(*) AS total_bets,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS wins,
      SUM(CASE WHEN status IN ('lost', 'cashout') THEN 1 ELSE 0 END) AS losses,
      ROUND(
          CASE 
              WHEN SUM(CASE WHEN status IN ('lost', 'cashout') THEN 1 ELSE 0 END) = 0 THEN 
                  CAST(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS REAL)
              ELSE 
                  CAST(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS REAL) / 
                  CAST(SUM(CASE WHEN status IN ('lost', 'cashout') THEN 1 ELSE 0 END) AS REAL)
          END, 2) AS win_loss_ratio,
      ROUND(SUM(CASE WHEN status = 'won' THEN amount * potentialMultiplier ELSE 0 END) - SUM(amount), 2) AS profit,
      AVG(potentialMultiplier) AS avg_potential_multiplier,
      AVG(amount) AS avg_bet_amount,
      ROUND(((SUM(CASE WHEN status = 'won' THEN amount * potentialMultiplier ELSE 0 END) - SUM(amount)) / SUM(amount)) * 100, 2) AS roi
    FROM sports_bets
    WHERE user = ? AND status != 'pending'
    GROUP BY user`;

    const row = await db.get(query, username);
    return row;
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques de l'utilisateur :", error);
    throw error;
  }
}

async function sendTrackedUserMessage(bet, followerData, betAmountUSD, betiid, isSuccess, message, iid) {
  const chatId = followerData.telegram_id;
  const formattedBetAmountUSD = parseFloat(betAmountUSD).toFixed(2);
  let betMessage;

  if (isSuccess) {
    await sendNotification(bet, followerData, betAmountUSD, iid);
    await saveondb(followerData, iid, bet, betAmountUSD);
    betMessage = `You are following ${
      bet.user
    }. Bet amount: ${formattedBetAmountUSD}, your bets : [stake.bet](https://stake.bet/fr?iid=sport%3A${iid.replace(
      "sport:",
      ""
    )}&modal=bet)`;
  } else {
    betMessage = `You are following ${bet.user} but your bet could not be placed : 
      ${message}, 
      you can see the bet here : [stake.bet](https://stake.bet/fr?iid=sport%3A${betiid.replace("sport:", "")}&modal=bet)`;
  }
  try {
    await sendTelegramPREMIUM(betMessage, chatId);
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error);
  }
}

async function sendNotification(bet, followerData, betAmountUSD, iid) {
  const telegramId = followerData.telegram_id;
  const user = bet.user;
  const betAmount = parseFloat(betAmountUSD).toFixed(2);
  const betLink = `https://stake.bet/fr?iid=sport%3A${iid.replace("sport:", "")}&modal=bet`;
  await sendCustomNotification(telegramId, user, betAmount, betLink);
}

async function saveondb(followerData, iid, bet, betAmountUSD) {
  const db = await openDb();

  const telegram_id = followerData.telegram_id;
  const createdAt = bet.createdAt;
  const followed_user = bet.user;
  const amount = parseFloat(betAmountUSD).toFixed(2);
  const currency = followerData.currency;
  const odds = bet.potentialMultiplier;

  const insertSql = `
      INSERT INTO betting_records (telegram_id, iid, createdAt, followed_user, amount, currency, odds)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.run(insertSql, [telegram_id, iid, createdAt, followed_user, amount, currency, odds]);
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    await db.close();
  }
}
