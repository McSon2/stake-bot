import dbPromise from "./connection.js";
import fs from "fs";
import csv from "csv-parser";

let logInterval = 600000; // 60 secondes
let logTimer = null;
let logCount = {};

export async function getTotalEntriesCount() {
  try {
    const db = await dbPromise;
    const row = await db.get("SELECT COUNT(*) as totalCount FROM sports_bets");
    return row.totalCount;
  } catch (error) {
    console.error("Error fetching total entries count:", error);
    return null;
  }
}

export async function getPendingBets() {
  try {
    const priorityUsers = await getPriorityUsers();
    const db = await dbPromise;

    let query =
      "SELECT iid, CASE WHEN user IN (" +
      priorityUsers.map(() => "?").join(",") +
      ") THEN 0 ELSE 1 END AS priority FROM sports_bets WHERE status = 'pending'";
    query += " ORDER BY priority, createdAt DESC";

    const rows = await db.all(query, priorityUsers);
    return rows.map((row) => {
      return { iid: row.iid };
    });
  } catch (error) {
    console.error("Error fetching pending bets:", error);
    return [];
  }
}

async function getPriorityUsers() {
  const priorityUsers = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream("topUsersData.csv")
      .pipe(csv())
      .on("data", (row) => {
        priorityUsers.push(row.USER);
      })
      .on("end", () => {
        resolve(priorityUsers);
      })
      .on("error", reject);
  });
}

export async function updateBetStatus(iid, status) {
  try {
    const db = await dbPromise;
    await db.run("UPDATE sports_bets SET status = ? WHERE iid = ?", status, iid);
    addToLogQueue(status);
  } catch (error) {
    console.error(`Error updating status for bet ${iid}:`, error);
  }
}

export async function fetchTrackedUsersData() {
  try {
    const db = await dbPromise;
    const users = await db.all(
      `
          SELECT 
      ut.followed_username,
      ut.telegram_id,
      ut.bet_amount,
      CASE 
        WHEN ut.variable_bet = 1 THEN 'Y'
        ELSE 'N'
      END as variable_bet,
      ut.max_bet_amount,
      ut.currency,
      ak.api_key
    FROM 
      user_tracking AS ut
    JOIN 
      apikey AS ak ON ut.telegram_id = ak.telegram_id
    WHERE 
      ut.auto_bet_active = 1
    `
    );
    return users;
  } catch (error) {
    console.error("Error fetching tracked users data:", error);
    return [];
  }
}

function addToLogQueue(status) {
  const key = `Bet ${status}`;
  if (!logCount[key]) {
    logCount[key] = { count: 0 };
  }
  logCount[key].count++;

  if (!logTimer) {
    logTimer = setTimeout(flushLogQueue, logInterval);
  }
}

function flushLogQueue() {
  for (const [key, data] of Object.entries(logCount)) {
    console.log(`${data.count} bets updated to ${key}`);
  }
  logCount = {};
  clearTimeout(logTimer);
  logTimer = null;
}
