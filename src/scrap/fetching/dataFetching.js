import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { fetchAndClose } from "../../browser/pagePool.js";
import { VARIABLES } from "../../global.js";
import { handleCurrencyData, handleData } from "../dataProcessing/handling.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SPORTS_QUERY = fs.readFileSync(
  path.join(__dirname, "..", "..", "queries", "sportsQuery.graphql"),
  "utf8"
);
const CURRENCY_QUERY = fs.readFileSync(
  path.join(__dirname, "..", "..", "queries", "currencyQuery.graphql"),
  "utf8"
);
const BET_LOOKUP_QUERY = fs.readFileSync(
  path.join(__dirname, "..", "..", "queries", "betLookupQuery.graphql"),
  "utf8"
);
const CHALL_QUERY = fs.readFileSync(
  path.join(__dirname, "..", "..", "queries", "challQuery.graphql"),
  "utf8"
);

const MAX_RETRIES = 5;

export async function fetchSportsData() {
  let retryCount = 0;
  while (retryCount < MAX_RETRIES) {
    try {
      const data = await fetchAndClose("https://stake.bet/_api/graphql", {
        query: SPORTS_QUERY,
        variables: VARIABLES,
      });
      handleData(data);
      setTimeout(fetchSportsData, 5 * 1000); // Replanifier la prochaine exécution
      return; // Sortir de la boucle après le succès
    } catch (error) {
      console.error(
        `Une erreur s'est produite lors de la tentative ${retryCount + 1}:`,
        error.message
      );
      retryCount++;
    }
  }
  console.error("Toutes les tentatives ont échoué. Le script va s'arrêter.");
  process.exit(1); // Arrêter le processus avec un code d'erreur
}

export async function fetchCurrencyRates() {
  try {
    const data = await fetchAndClose("https://stake.bet/_api/graphql", {
      query: CURRENCY_QUERY,
    });
    handleCurrencyData(data);
  } catch (error) {
    console.error("Error fetching currency rates:", error.message);
  }
  setTimeout(fetchCurrencyRates, 15 * 60 * 1000);
}

export async function fetchBetDetailsWithStatus(iid) {
  try {
    //console.log(`Fetching bet details for IID: ${iid}`); // Log the IID being used for the fetch
    const data = await fetchAndClose("https://stake.bet/_api/graphql", {
      query: BET_LOOKUP_QUERY,
      variables: { iid },
    });

    if (!data.data || !data.data.bet || !data.data.bet.bet) {
      //console.log("Unexpected data structure:", data); // Log the unexpected data structure
      throw new Error("Data structure from response is not as expected");
    }

    const outcomes = data.data.bet.bet.outcomes;

    if (outcomes.some((outcome) => outcome.status === "pending")) {
      //console.log("Bet status is pending"); // Log when bet status is pending
      data.status = "pending";
    } else {
      const status = data.data.bet.bet.status;
      //console.log(`Bet status from data: ${status}`); // Log the bet status from data

      if (status === "cashout") {
        //console.log("Bet status is cashout"); // Log when bet status is cashout
        data.status = "cashout";
      } else {
        const payout = data.data.bet.bet.payout;
        //console.log(`Bet payout: ${payout}`); // Log the payout

        if (payout === 0) {
          //console.log("Bet is lost"); // Log when bet is lost
          data.status = "lost";
        } else {
          //console.log("Bet is won"); // Log when bet is won
          data.status = "won";
        }
      }
    }
    //console.log("Final data to return:", data); // Log the final data structure before returning
    return data;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des détails du pari:",
      error.message
    );
    return null;
  }
}
