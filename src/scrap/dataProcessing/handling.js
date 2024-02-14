import Database from "better-sqlite3";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { betDetails } from "../../autobet/autobet.js";
import { fetchTrackedUsersData } from "../../database/query.js";
import {
  conversionRatesUSD,
  processedBets,
  topUsersArray,
  trackedUsersMap,
  updateTrackedUsersMap,
} from "../../global.js";
import {
  sendTelegramMessage,
  sendTelegramX,
} from "../../telegram/messaging.js";
import { formatDate } from "../../utils/formatDate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, "../../sports.db");
const db = new Database(dbPath);

let logInterval = 600000; // 60 secondes
let logTimer = null;
let logCount = {};

// Cette fonction gère chaque pari individuellement
async function processBet(bet) {
  if (!bet.bet.user || processedBets.has(bet.iid)) {
    return null;
  }
  processedBets.add(bet.iid);

  let convertedAmount = bet.bet.amount;
  if (bet.bet.currency && conversionRatesUSD[bet.bet.currency]) {
    convertedAmount *= conversionRatesUSD[bet.bet.currency];
  }

  return {
    iid: bet.iid,
    createdAt: formatDate(bet.bet.createdAt),
    potentialMultiplier: bet.bet.potentialMultiplier
      ? parseFloat(bet.bet.potentialMultiplier.toFixed(2))
      : undefined,
    amount: convertedAmount
      ? parseFloat(convertedAmount.toFixed(2))
      : undefined,
    currency: "USD",
    user: bet.bet.user ? bet.bet.user.name : undefined,
    status: "pending",
  };
}

// Cette fonction s'occupe de l'envoi des messages Telegram
async function sendTelegramMessages(bet, multiplier) {
  const messages = [];
  await updateTrackedUsersData();
  if (bet.user !== "mcson") {
    messages.push(sendConditionalMessage(bet.iid, multiplier));
  }
  if (topUsersArray.some((userData) => userData.user === bet.user)) {
    const userData = topUsersArray.find(
      (userData) => userData.user === bet.user
    );
    messages.push(sendTopUserMessage(bet, userData));
  }

  if (trackedUsersMap.has(bet.user)) {
    const followersData = trackedUsersMap.get(bet.user);
    await betDetails(bet, followersData);
  }
  try {
    await Promise.all(messages);
  } catch (error) {
    console.error("Error sending Telegram messages:", error);
  }
}

async function sendConditionalMessage(iid, multiplier) {
  const messages = {
    "100000000-300000000": `300M bet detected. Odds: ${multiplier}, bet: [stake.bet](https://stake.bet/fr?iid=sport%3A${iid.replace(
      "sport:",
      ""
    )}&modal=bet)`,
    "900000-1500000": `1M bet detected. Odds: ${multiplier}, bet: [stake.bet](https://stake.bet/fr?iid=sport%3A${iid.replace(
      "sport:",
      ""
    )}&modal=bet)`,
    "90000-250000": `100k bet detected. Odds: ${multiplier}, bet: [stake.bet](https://stake.bet/fr?iid=sport%3A${iid.replace(
      "sport:",
      ""
    )}&modal=bet)`,
  };

  for (let range in messages) {
    let [min, max] = range.split("-").map(Number);
    if (multiplier >= min && multiplier <= max) {
      await sendTelegramX(messages[range]);
      break;
    }
  }
}

async function sendTopUserMessage(bet, userData) {
  const iidValue = bet.iid.replace("sport:", "");
  const amounts = bet.amount ? parseFloat(bet.amount.toFixed(2)) : undefined;
  let avgBetAmount = parseFloat(userData.avg_bet_amount).toFixed(2);
  let avgM = parseFloat(userData.avg_potential_multiplier).toFixed(2);

  const message = `User ${userData.user} placed a bet of ${amounts}$ with odds of ${bet.potentialMultiplier}!,
      Total bets: ${userData.total_bets}, 
      Wins: ${userData.wins}, 
      Losses: ${userData.losses}, 
      Win-Loss Ratio: ${userData.win_loss_ratio}, 
      Profit: ${userData.profit}, 
      ROI: ${userData.roi}%, 
      Average Bet: ${avgBetAmount}$, 
      Average Odds: ${avgM}, 
      Bet Link: [stake.bet](https://stake.bet/fr?iid=sport%3A${iidValue}&modal=bet)`;

  await sendTelegramMessage(message);
}

// Cette fonction gère l'insertion des données dans la base de données
async function insertBetData(results) {
  if (results.length === 0) {
    addToLogQueue("No new data to insert.");
    return;
  }

  const insert = db.prepare(`
    INSERT INTO sports_bets (iid, createdAt, potentialMultiplier, amount, currency, user, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(iid) DO UPDATE SET 
      createdAt = excluded.createdAt, 
      potentialMultiplier = excluded.potentialMultiplier, 
      amount = excluded.amount, 
      currency = excluded.currency, 
      user = excluded.user, 
      status = excluded.status`);

  const insertMany = db.transaction((records) => {
    for (const record of records) {
      insert.run([
        record.iid,
        record.createdAt,
        record.potentialMultiplier,
        record.amount,
        record.currency,
        record.user,
        record.status,
      ]);
    }
  });

  try {
    insertMany(
      results.map((result) => ({
        iid: result.iid,
        createdAt: result.createdAt,
        potentialMultiplier: result.potentialMultiplier,
        amount: result.amount,
        currency: result.currency,
        user: result.user,
        status: result.status,
      }))
    );
    addToLogQueue("Data inserted successfully.");
  } catch (error) {
    console.error("Error inserting data:", error);
  }
}

// La fonction principale qui utilise les fonctions ci-dessus
export async function handleData(rawData) {
  if (!rawData || !rawData.data || !rawData.data.allSportBets) {
    console.error("Données en entrée non valides");
    return [];
  }

  // Récupérer la liste des utilisateurs suivis une seule fois au début
  if (trackedUsersMap.size === 0) {
    await updateTrackedUsersData();
  }

  const results = [];

  for (const bet of rawData.data.allSportBets) {
    const processedBet = await processBet(bet);
    if (processedBet) {
      await sendTelegramMessages(
        processedBet,
        processedBet.potentialMultiplier
      );
      results.push(processedBet);
    }
  }
  await insertBetData(results);
  return results;
}

export function handleCurrencyData(data) {
  const currencies = data?.data?.info?.currencies;
  if (currencies && currencies.length > 0) {
    currencies.forEach((currency) => {
      conversionRatesUSD[currency.name] = currency.usd;
    });
  }
}

async function updateTrackedUsersData() {
  const users = await fetchTrackedUsersData();
  updateTrackedUsersMap(users);
}

function addToLogQueue(message) {
  if (message === "No new data to insert.") {
    const key = "NoData";
    if (!logCount[key]) {
      logCount[key] = { count: 0 };
    }
    logCount[key].count++;
  } else if (message === "Data inserted successfully.") {
    const key = "DataInserted";
    if (!logCount[key]) {
      logCount[key] = { count: 0 };
    }
    logCount[key].count++;
  }

  if (!logTimer) {
    logTimer = setTimeout(flushLogQueue, logInterval);
  }
}

function flushLogQueue() {
  for (const [key, data] of Object.entries(logCount)) {
    if (key === "NoData") {
      console.log(`${data.count} times: No new data to insert.`);
    } else if (key === "DataInserted") {
      console.log(`${data.count} times: Data inserted successfully.`);
    }
  }
  logCount = {};
  clearTimeout(logTimer);
  logTimer = null;
}
