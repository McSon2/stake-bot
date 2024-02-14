export const processedBets = new Set();
export const conversionRatesUSD = {};
export let topUsersMap = new Map();
export let topUsersArray = [];
export let trackedUsersMap = new Map();
export const MODE = process.argv[2] || "prod";
export const PROFIT_WEIGHT = 0.25; //RATIO
export const TOTAL_BETS_WEIGHT = 0.25;
export const ROI_WEIGHT = 0.25;
export const NUMBER_OF_USERS = 20;
export const VARIABLES = { limit: 50 };
export const VARIABLES2 = {
  limit: 24,
  sort: "startAt",
  count: "available",
  type: "available",
  offset: 0,
};

export function updateTopUsersMap(newMap) {
  topUsersMap = newMap;
  topUsersArray = Array.from(topUsersMap.values())
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, 5);
}

export function updateTrackedUsersMap(users) {
  trackedUsersMap.clear();
  for (const user of users) {
    // Si l'utilisateur suivi existe déjà dans la map, ajoutez ce nouvel utilisateur à la liste
    if (trackedUsersMap.has(user.followed_username)) {
      trackedUsersMap.get(user.followed_username).push(user);
    } else {
      // Sinon, créez une nouvelle entrée avec un tableau contenant cet utilisateur
      trackedUsersMap.set(user.followed_username, [user]);
    }
  }
}
