import { fetchBetDetailsWithStatus } from "../fetching/dataFetching.js";
import { getPendingBets, updateBetStatus } from "../../database/query.js";
import pLimit from "p-limit";

const limit = pLimit(5);

export async function processBettingCycle() {
  try {
    const pendingBets = await getPendingBets();
    console.log(`${pendingBets.length} paris en attente vont être traités.`);
    const promises = pendingBets.map((bet) => limit(() => processBet(bet)));
    const results = await Promise.all(promises);
    const updatedBets = results.filter((result) => result !== "pending");
    console.log(`${updatedBets.length} paris ont changé de statut.`);
  } catch (error) {
    console.error("Erreur pendant le cycle de traitement:", error);
  } finally {
    processBettingCycle();
  }
}

async function processBet(bet) {
  const details = await fetchBetDetailsWithStatus(bet.iid);
  if (details && details.status !== "pending") {
    await updateBetStatus(bet.iid, details.status);
    return details.status;
  }
  return "pending";
}