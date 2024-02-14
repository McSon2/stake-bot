import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPromise = open({
  filename: "sports.db",
  driver: sqlite3.Database,
});

async function testDb() {
  try {
    const db = await dbPromise;
    const rows = await db.all("SELECT DISTINCT telegram_id FROM user_tracking WHERE auto_bet_active = 1");
    const result = rows.map((row) => row.telegram_id);
    console.log(result);
    console.log(result);
  } catch (error) {
    console.error("Erreur lors du test de la base de données:", error);
  }
}

testDb();
