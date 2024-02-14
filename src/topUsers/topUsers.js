import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dbPromise from "../database/connection.js";
import {
  NUMBER_OF_USERS,
  PROFIT_WEIGHT,
  ROI_WEIGHT,
  TOTAL_BETS_WEIGHT,
  topUsersMap,
  updateTopUsersMap,
} from "../global.js";
import { sendTelegramMessage } from "../telegram/messaging.js";
import { getDifferenceMessage } from "../utils/difference.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function updateTopUsersData() {
  const topUsers = await getUsersWithCombinedScore();

  await writeUsersToCsv(topUsers);

  const newTopUsersMap = new Map();

  let combinedMessage = "";

  for (let i = 0; i < Math.min(topUsers.length, 5); i++) {
    const user = topUsers[i];
    let avgBetAmount = parseFloat(user.avg_bet_amount).toFixed(2);
    let avgM = parseFloat(user.avg_potential_multiplier).toFixed(2);
    let avgBetsPerDay = parseFloat(user.avg_bets_per_day).toFixed(2);

    let diffs = {
      totalBets: "",
      ratio: "",
      roi: "",
      avgBet: "",
      avgM: "",
    };

    // Utiliser topUsersMap pour obtenir les différences
    if (topUsersMap.has(user.user)) {
      const prevData = topUsersMap.get(user.user);
      diffs.totalBets = getDifferenceMessage(
        user.total_bets,
        prevData.total_bets
      );
      diffs.ratio = getDifferenceMessage(
        user.win_loss_ratio,
        prevData.win_loss_ratio
      );
      diffs.roi = getDifferenceMessage(user.roi, prevData.roi);
      diffs.avgBet = getDifferenceMessage(
        avgBetAmount,
        parseFloat(prevData.avg_bet_amount).toFixed(2)
      );
      diffs.avgM = getDifferenceMessage(
        avgM,
        parseFloat(prevData.avg_potential_multiplier).toFixed(2)
      );
    }

    combinedMessage += `__Profile ${i + 1}: __`;
    combinedMessage += `__${user.user}__\n\n`;
    combinedMessage += `Total bets: ${user.total_bets}${
      diffs.totalBets ? " (" + diffs.totalBets + ")" : ""
    }\n`;
    combinedMessage += `Wins: ${user.wins}\n`;
    combinedMessage += `Losses: ${user.losses}\n`;
    combinedMessage += `Ratio: ${user.win_loss_ratio}${
      diffs.ratio ? " (" + diffs.ratio + ")" : ""
    }\n`;
    combinedMessage += `Profit: ${user.profit}$\n`;
    combinedMessage += `ROI: ${user.roi}%${
      diffs.roi ? " (" + diffs.roi + "%)" : ""
    }\n`;
    combinedMessage += `Average bet: ${avgBetAmount}$${
      diffs.avgBet ? " (" + diffs.avgBet + "$)" : ""
    }\n`;
    combinedMessage += `Average odds: ${avgM}${
      diffs.avgM ? " (" + diffs.avgM + ")" : ""
    }\n`;
    combinedMessage += `Avg Bets/Day: ${avgBetsPerDay}\n\n`;
  }

  topUsers.forEach((user) => {
    newTopUsersMap.set(user.user, user);
  });

  // Remplacer topUsersMap par la nouvelle carte
  updateTopUsersMap(newTopUsersMap);
  combinedMessage +=
    "Link to the Big Odds Cannal : https://t.me/+aWez63exCJUyMzA8";

  await sendTelegramMessage(combinedMessage.trim());

  setTimeout(updateTopUsersData, 1 * 60 * 60 * 1000);
}

async function getUsersWithCombinedScore() {
  const queryFilePath = path.join(
    __dirname,
    "..",
    "queries",
    "userCombinedScoreQuery.sql"
  );
  const query = fs.readFileSync(queryFilePath, "utf8");

  try {
    const db = await dbPromise;
    const rows = await db.all(query, [
      PROFIT_WEIGHT,
      TOTAL_BETS_WEIGHT,
      ROI_WEIGHT,
      NUMBER_OF_USERS,
    ]);
    return rows;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des utilisateurs avec score combiné :",
      error
    );
    return [];
  }
}

async function writeUsersToCsv(topUsers) {
  const csvFilePath = path.join(__dirname, "..", "..", "topUsersData.csv");

  const csvWriter = createObjectCsvWriter({
    path: csvFilePath,
    header: [
      { id: "user", title: "USER" },
      { id: "total_bets", title: "TOTAL_BETS" },
      { id: "wins", title: "WINS" },
      { id: "losses", title: "LOSSES" },
      { id: "ratio", title: "RATIO" },
      { id: "roi", title: "ROI" },
      { id: "profit", title: "PROFIT" },
      { id: "avg_multi", title: "AVG_MULTI" },
      { id: "avg_amount", title: "AVG_AMOUNT" },
      { id: "avg_day", title: "AVG_DAY" },
    ],
  });

  // Préparez les données pour l'écriture
  const records = topUsers.map((user) => ({
    user: user.user,
    total_bets: user.total_bets,
    wins: user.wins,
    losses: user.losses,
    ratio: user.win_loss_ratio,
    roi: user.roi,
    profit: user.profit,
    avg_multi: user.avg_potential_multiplier,
    avg_amount: user.avg_bet_amount,
    avg_day: user.avg_bets_per_day,
  }));

  try {
    await csvWriter.writeRecords(records);
    console.log("The CSV file was written successfully");
  } catch (err) {
    console.error("Error writing CSV file", err);
  }
}
