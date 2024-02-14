import { Scenes, Markup } from "telegraf";
import dbPromise from "../database/connection.js";
import { fetchTrackedUsersData } from "../database/query.js";
import { updateTrackedUsersMap } from "../global.js";

const userTrackingMenuScene = new Scenes.BaseScene("USER_TRACKING_MENU_SCENE");
const followUserScene = new Scenes.BaseScene("FOLLOW_USER_SCENE");
const unfollowUserScene = new Scenes.BaseScene("UNFOLLOW_USER_SCENE");
const toggleAutoBetScene = new Scenes.BaseScene("TOGGLE_AUTO_BET_SCENE");
const viewAllScene = new Scenes.BaseScene("VIEW_ALL_SCENE");
const userStatsScene = new Scenes.BaseScene("USER_STATS_SCENE");
const BACK_ACTION = "Back";
const editUser = new Scenes.BaseScene("EDIT_USER");

const yesNoKeyboard = Markup.inlineKeyboard([Markup.button.callback("Yes", "oui"), Markup.button.callback("No", "non")]).resize();
const currencyKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("ETH", "eth"),
    Markup.button.callback("BTC", "btc"),
    Markup.button.callback("LTC", "ltc"),
    Markup.button.callback("XRP", "xrp"),
    Markup.button.callback("TRX", "trx"),
  ],
  [
    Markup.button.callback("EOS", "eos"),
    Markup.button.callback("BNB", "bnb"),
    Markup.button.callback("BUSD", "busd"),
    Markup.button.callback("USDC", "usdc"),
    Markup.button.callback("USDT", "usdt"),
  ],
]).resize();

const keyboards = {
  main: {
    reply_markup: {
      keyboard: [["Follow User", "Unfollow User"], ["Edit User", "Toggle Auto Bet"], ["View All", "User Stats"], ["Back"]],
      resize_keyboard: true,
    },
  },
};

userTrackingMenuScene.enter((ctx) => ctx.reply("User Tracking Menu:", keyboards.main));
userTrackingMenuScene.hears("Follow User", (ctx) => ctx.scene.enter("FOLLOW_USER_SCENE"));
userTrackingMenuScene.hears("Unfollow User", (ctx) => ctx.scene.enter("UNFOLLOW_USER_SCENE"));
userTrackingMenuScene.hears("Edit User", (ctx) => ctx.scene.enter("EDIT_USER"));
userTrackingMenuScene.hears("Toggle Auto Bet", (ctx) => ctx.scene.enter("TOGGLE_AUTO_BET_SCENE"));
userTrackingMenuScene.hears("View All", (ctx) => ctx.scene.enter("VIEW_ALL_SCENE"));
userTrackingMenuScene.hears("User Stats", (ctx) => ctx.scene.enter("USER_STATS_SCENE"));
userTrackingMenuScene.hears("Back", (ctx) => ctx.scene.enter("MAIN_MENU_SCENE"));

// Follow User Scene
followUserScene.enter(async (ctx) => {
  ctx.session.followedUsername = null;
  ctx.session.betAmount = null;
  ctx.session.variableBet = null;
  ctx.session.maxBetAmount = null;
  ctx.session.autoBetActive = null;
  await ctx.reply("Please enter the username of the user you wish to track:");
  ctx.session.step = "askUsername";
});

followUserScene.use((ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.trim() === BACK_ACTION) {
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  } else {
    return next();
  }
});

followUserScene.on("text", async (ctx) => {
  let text = ctx.message.text.trim();
  switch (ctx.session.step) {
    case "askUsername":
      ctx.session.followedUsername = text;
      if (await isUserAlreadyFollowing(ctx, text)) {
        await ctx.reply(`You're already following the user ${text}.`);
        ctx.scene.enter("USER_TRACKING_MENU_SCENE");
        return;
      }
      ctx.session.step = "askCurrency";
      await ctx.reply("Please choose the currency for the bet:", currencyKeyboard);
      break;

    case "askCurrency":
      ctx.session.step = "askBetAmount";
      await ctx.reply("Please enter the bet amount:");
      break;

    case "askBetAmount":
      // Déclarez formattedText avant de l'utiliser
      const formattedBetText = text.replace(/,/g, ".");
      if (!isValidNumber(formattedBetText)) {
        await ctx.reply("Invalid bet amount. Try again:");
        return;
      }
      ctx.session.betAmount = parseFloat(formattedBetText).toFixed(2);
      ctx.session.step = "askVariableBet";
      await ctx.reply("Is betting variable?", yesNoKeyboard);
      break;

    case "askVariableBet":
      text = text.toLowerCase();
      if (text !== "oui" && text !== "non") {
        await ctx.reply("Please answer 'yes' or 'no':");
        return;
      }
      ctx.session.variableBet = text === "oui";
      if (ctx.session.variableBet) {
        ctx.session.step = "askMaxBetAmount";
        await ctx.reply("Please enter the maximum bet amount:");
      } else {
        ctx.session.maxBetAmount = null;
        ctx.session.step = "askActivate";
        await ctx.reply("Would you like to activate automatic betting?");
      }
      break;

    case "askMaxBetAmount":
      // Déclarez formattedText avant de l'utiliser
      const formattedMaxBetText = text.replace(/,/g, ".");
      if (!isValidNumber(formattedMaxBetText)) {
        await ctx.reply("Maximum amount of invalid bet. Try again:");
        return;
      }
      ctx.session.maxBetAmount = parseFloat(formattedMaxBetText).toFixed(2);
      ctx.session.step = "askActivate";
      await ctx.reply("Would you like to activate automatic betting?", yesNoKeyboard);
      break;
  }
});

// Gestionnaire pour le bouton 'oui'
followUserScene.action("oui", async (ctx) => {
  if (ctx.session.step === "askVariableBet") {
    ctx.session.variableBet = true;
    ctx.session.step = "askMaxBetAmount";
    await ctx.reply("Please enter the maximum bet amount:");
  } else if (ctx.session.step === "askActivate") {
    ctx.session.autoBetActive = true;
    ctx.session.step = "save";
    await saveUserTrackingData(ctx);
    await ctx.reply("The user's tracking information has been successfully recorded.");
    await ctx.reply(`You are now following : ${ctx.session.followedUsername}`);
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  }
  await ctx.answerCbQuery();
});

// Gestionnaire pour le bouton 'non'
followUserScene.action("non", async (ctx) => {
  if (ctx.session.step === "askVariableBet") {
    ctx.session.variableBet = false;
    ctx.session.step = "askActivate";
    await ctx.reply("Would you like to activate automatic betting?", yesNoKeyboard);
  } else if (ctx.session.step === "askActivate") {
    ctx.session.autoBetActive = false;
    ctx.session.step = "save";
    await saveUserTrackingData(ctx);
    await ctx.reply("The user's tracking information has been successfully recorded.");
    await ctx.reply(`You are now following : ${ctx.session.followedUsername}`);
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  }
  await ctx.answerCbQuery();
});

followUserScene.action(["eth", "btc", "ltc", "xrp", "trx", "eos", "bnb", "busd", "usdc", "usdt"], async (ctx) => {
  ctx.session.currency = ctx.match[0]; // ctx.match[0] contiendra la devise sélectionnée
  ctx.session.step = "askBetAmount";
  await ctx.reply("Please enter the bet amount:");
  await ctx.answerCbQuery();
});

// Unfollow User Scene

unfollowUserScene.enter(async (ctx) => {
  try {
    const followedUsers = await getUserFollowed(ctx.from.id);
    if (followedUsers.length > 0) {
      //const followedListString = followedUsers.join("\n");
      const buttons = followedUsers.map((user) => Markup.button.callback(user, `unfollow_${user}`));
      const buttonRows = [];
      for (let i = 0; i < buttons.length; i += 3) {
        buttonRows.push(buttons.slice(i, i + 3));
      }
      const inlineKeyboard = Markup.inlineKeyboard(buttonRows);
      await ctx.reply(`Who do you want to stop following?`, inlineKeyboard);
      ctx.session.step = "unfollowUser";
    } else {
      await ctx.reply("You're not following anyone.");
      ctx.scene.enter("USER_TRACKING_MENU_SCENE");
    }
  } catch (error) {
    console.error("Error fetching followed users:", error);
    await ctx.reply("An error has occurred. Please try again.");
  }
});

unfollowUserScene.use((ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.trim() === BACK_ACTION) {
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  } else {
    return next();
  }
});

unfollowUserScene.action(/^unfollow_(.+)$/, async (ctx) => {
  const usernameToUnfollow = ctx.match[1];
  try {
    await unfollowUser(ctx.from.id, usernameToUnfollow);
    await ctx.reply(`You no longer follow ${usernameToUnfollow}.`);
  } catch (error) {
    console.error("Error during unfollow:", error);
    await ctx.reply("An error occurred while trying to stop following. Please try again.");
  }
  ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  await ctx.answerCbQuery();
});

//editUserScene

editUser.enter(async (ctx) => {
  try {
    const followedUsers = await getUserFollowed(ctx.from.id);
    if (followedUsers.length > 0) {
      const buttons = followedUsers.map((user) => Markup.button.callback(user, `selectUser_${user}`));
      const buttonRows = [];
      for (let i = 0; i < buttons.length; i += 3) {
        buttonRows.push(buttons.slice(i, i + 3));
      }
      const inlineKeyboard = Markup.inlineKeyboard(buttonRows);
      await ctx.reply("Which tracked user would you like to change?", inlineKeyboard);
      ctx.session.step = "chooseUserToEdit";
    } else {
      await ctx.reply("You're not following anyone.");
      ctx.scene.enter("USER_TRACKING_MENU_SCENE");
    }
  } catch (error) {
    console.error("Error fetching followed users:", error);
    await ctx.reply("An error has occurred. Please try again.");
  }
});

editUser.use((ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.trim() === BACK_ACTION) {
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  } else {
    return next();
  }
});

editUser.action(/^selectUser_(.+)$/, async (ctx) => {
  const usernameToEdit = ctx.match[1];
  ctx.session.userToEdit = usernameToEdit;
  ctx.session.step = "chooseEditOption";
  const editOptionsKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("Bet Amount", "edit_betAmount"),
      Markup.button.callback("Variable Bet", "edit_variableBet"),
      Markup.button.callback("Max Bet Amount", "edit_maxBetAmount"),
    ],
    [Markup.button.callback("Currency", "edit_currency")],
  ]);
  await ctx.reply(`Which parameter would you like to change to ${usernameToEdit} ?`, editOptionsKeyboard);
  await ctx.answerCbQuery();
});

editUser.action(/^edit_(.+)$/, async (ctx) => {
  const editOption = ctx.match[1];
  ctx.session.editOption = editOption;

  switch (editOption) {
    case "betAmount":
    case "maxBetAmount":
      await ctx.reply(`Enter the new value for ${editOption}`);
      ctx.session.step = "receiveNewValue";
      break;
    case "variableBet":
      await ctx.reply("Is betting variable?", yesNoKeyboard);
      break;
    case "currency":
      await ctx.reply("Choose the new currency:", currencyKeyboard);
      break;
    default:
      await ctx.reply("Option not recognized. Please try again.");
      break;
  }
  await ctx.answerCbQuery();
});

editUser.on("text", async (ctx) => {
  if (ctx.session.step === "receiveNewValue") {
    const newValue = ctx.message.text.trim();
    const chatId = ctx.from.id;
    const { userToEdit, editOption } = ctx.session;

    try {
      switch (editOption) {
        case "betAmount":
          await updateBetAmount(chatId, userToEdit, newValue);
          break;
        case "maxBetAmount":
          await updateVariableBet(chatId, userToEdit, ctx.session.variableBet, newValue);
          break;
        // Gérer d'autres cas si nécessaire
      }
      await ctx.reply(`The value for ${editOption} has been updated for ${userToEdit}`);
      const userDetails = await getFollowedUserDetails(chatId, userToEdit);
      if (userDetails) {
        const message = `${userDetails.username} - Bet : ${userDetails.betAmount} - Var : ${
          userDetails.variableBet ? "YES" : "NO"
        } - Max : ${userDetails.maxBetAmount} - Currency: ${userDetails.currency} - ${userDetails.autoBetActive}`;

        await ctx.reply(message);
      } else {
        await ctx.reply("Unable to retrieve updated details.");
      }
    } catch (error) {
      await ctx.reply("An error occurred during the update.");
      console.error(error);
    }
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  }
});

editUser.action("oui", async (ctx) => {
  ctx.session.variableBet = true; // Mettre à jour variableBet dans la session
  await ctx.reply("Enter value for Max Bet Amount");
  ctx.session.editOption = "maxBetAmount";
  ctx.session.step = "receiveNewValue";
  await ctx.answerCbQuery();
});

editUser.action("non", async (ctx) => {
  const chatId = ctx.from.id;
  const userToEdit = ctx.session.userToEdit;
  await updateVariableBet(chatId, userToEdit, false);
  await ctx.reply(`Variable Bet disabled for ${userToEdit}`);
  const userDetails = await getFollowedUserDetails(chatId, userToEdit);
  if (userDetails) {
    const message = `${userDetails.username} - Bet : ${userDetails.betAmount} - Var : ${
      userDetails.variableBet ? "YES" : "NO"
    } - Max : ${userDetails.maxBetAmount} - Currency: ${userDetails.currency} - ${userDetails.autoBetActive}`;
    await ctx.reply(message);
  } else {
    await ctx.reply("Unable to retrieve updated details.");
  }
  ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  await ctx.answerCbQuery();
});

editUser.action(["eth", "btc", "ltc", "xrp", "trx", "eos", "bnb", "busd", "usdc", "usdt"], async (ctx) => {
  const newCurrency = ctx.match[0];
  const chatId = ctx.from.id;
  const userToEdit = ctx.session.userToEdit;
  await updateCurrency(chatId, userToEdit, newCurrency);
  await ctx.reply(`The currency for ${userToEdit} has been updated for ${newCurrency}`);
  const userDetails = await getFollowedUserDetails(chatId, userToEdit);
  if (userDetails) {
    const message = `${userDetails.username} - Bet : ${userDetails.betAmount} - Var : ${
      userDetails.variableBet ? "YES" : "NO"
    } - Max : ${userDetails.maxBetAmount} - Currency: ${userDetails.currency} - ${userDetails.autoBetActive}`;
    await ctx.reply(message);
  } else {
    await ctx.reply("Unable to retrieve updated details.");
  }
  ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  await ctx.answerCbQuery();
});

// toggleAutoBetScene

toggleAutoBetScene.enter(async (ctx) => {
  try {
    const chatId = ctx.from.id;
    const followedUsersWithStatus = await getUserFollowedWithAutoBetStatus(chatId);
    if (followedUsersWithStatus.length > 0) {
      let message = "For which user do you want to enable or disable autobet ?\n";
      const buttons = followedUsersWithStatus.map((user) =>
        Markup.button.callback(`${user.username}`, `toggle_${user.username}`)
      );

      // Regrouper les boutons en lignes de 3 boutons
      const buttonRows = [];
      for (let i = 0; i < buttons.length; i += 3) {
        buttonRows.push(buttons.slice(i, i + 3));
      }

      const inlineKeyboard = Markup.inlineKeyboard(buttonRows);

      // Ajouter le statut de l'autobet à côté de chaque nom d'utilisateur
      followedUsersWithStatus.forEach((user) => {
        message += `${user.username} - Autobet ${user.autoBetActive ? "ON" : "OFF"}\n`;
      });

      await ctx.reply(message, inlineKeyboard);
      ctx.session.step = "askWhichUserToggle";
    } else {
      await ctx.reply("You're not following anyone.");
      ctx.scene.enter("USER_TRACKING_MENU_SCENE");
    }
  } catch (error) {
    await ctx.reply("An error has occurred. Please try again.");
    console.error(error);
  }
});

toggleAutoBetScene.use((ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.trim() === BACK_ACTION) {
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  } else {
    return next();
  }
});

toggleAutoBetScene.action(/^toggle_(.+)$/, async (ctx) => {
  // Extraire le nom d'utilisateur du callback data
  const usernameToToggle = ctx.match[1];
  try {
    // On récupère l'état actuel et on bascule l'autobet pour l'utilisateur sélectionné
    const result = await toggleUserAutoBet(ctx.from.id, usernameToToggle);
    if (result.success) {
      await ctx.reply(`The autobet for the user ${usernameToToggle} is now ${result.newStatus}.`);
    } else {
      await ctx.reply(`Unable to find user ${usernameToToggle} in your watch list.`);
    }
  } catch (error) {
    console.error("Error during autobet toggle:", error);
    await ctx.reply("An error occurred while updating the autobet.");
  }
  ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  await ctx.answerCbQuery();
});

// View All Scene

viewAllScene.enter(async (ctx) => {
  try {
    const usersDetails = await getAllFollowedUsersDetails(ctx.from.id);
    if (usersDetails.length === 0) {
      // Si aucun utilisateur suivi, envoyer un message spécifique
      await ctx.reply("You're not following anyone.");
    } else {
      // Sinon, continuer comme avant
      let message = "Users you follow :\n";
      usersDetails.forEach((user) => {
        message += `${user.username} - Bet : ${user.betAmount} - Var : ${user.variableBet ? "YES" : "NO"} - Max : ${
          user.maxBetAmount || "N/A"
        } - Currency: ${user.currency} - ${user.autoBetActive ? "ON" : "OFF"}\n`;
      });
      await ctx.reply(message);
    }
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  } catch (error) {
    await ctx.reply("An error occurred when retrieving tracked users.");
    console.error(error);
  }
});

viewAllScene.use((ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.trim() === BACK_ACTION) {
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  } else {
    return next();
  }
});

//user stats

userStatsScene.enter((ctx) => {
  ctx.reply("please enter a username");
});

userStatsScene.use((ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.trim() === BACK_ACTION) {
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
  } else {
    return next();
  }
});

userStatsScene.on("text", async (ctx) => {
  const username = ctx.message.text.trim();
  const userStats = await getUserStats(username);

  if (!userStats) {
    ctx.reply("No users found or no statistics available for this user.");
    ctx.scene.enter("USER_TRACKING_MENU_SCENE");
    return;
  }

  let message = `Profile : ${userStats.user}\nTotal bets: ${userStats.total_bets}\nWins: ${userStats.wins}\nLosses: ${
    userStats.losses
  }\nRatio: ${userStats.win_loss_ratio}\nProfit: ${userStats.profit}$\nROI: ${userStats.roi}%\nAverage bet: ${parseFloat(
    userStats.avg_bet_amount
  ).toFixed(2)}$\nAverage odds: ${parseFloat(userStats.avg_potential_multiplier).toFixed(2)}`;

  ctx.reply(message);

  ctx.scene.enter("USER_TRACKING_MENU_SCENE");
});

//Functions

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
    return row ? row : null; // Retourne la ligne de résultat ou null si aucun résultat n'est trouvé
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques de l'utilisateur :", error);
    throw error;
  }
}

function isValidNumber(value) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

async function getUserFollowed(chatId) {
  try {
    const db = await dbPromise;
    const query = `
        SELECT followed_username
        FROM user_tracking
        WHERE telegram_id = ?
      `;
    const rows = await db.all(query, chatId);
    const followedList = rows.map((row) => row.followed_username);
    return followedList;
  } catch (error) {
    console.error("Error fetching followed users:", error);
    throw error;
  }
}

async function getUserFollowedWithAutoBetStatus(chatId) {
  try {
    const db = await dbPromise;
    const query = `
        SELECT followed_username, auto_bet_active
        FROM user_tracking
        WHERE telegram_id = ?
      `;
    const rows = await db.all(query, chatId);
    const followedListWithStatus = rows.map((row) => ({
      username: row.followed_username,
      autoBetActive: row.auto_bet_active === 1,
    }));
    return followedListWithStatus;
  } catch (error) {
    console.error("Error fetching followed users with auto bet status:", error);
    throw error;
  }
}

async function getAllFollowedUsersDetails(chatId) {
  try {
    const db = await dbPromise;
    const query = `
      SELECT followed_username AS username, bet_amount, variable_bet, max_bet_amount, auto_bet_active, currency
      FROM user_tracking
      WHERE telegram_id = ?
    `;
    const rows = await db.all(query, chatId);
    return rows.map((row) => ({
      username: row.username,
      betAmount: parseFloat(row.bet_amount).toFixed(2),
      variableBet: row.variable_bet === 1,
      maxBetAmount: row.variable_bet ? parseFloat(row.max_bet_amount).toFixed(2) : "N/A",
      autoBetActive: row.auto_bet_active === 1,
      currency: row.currency,
    }));
  } catch (error) {
    console.error("Error fetching all followed users details:", error);
    throw error;
  }
}

async function unfollowUser(chatId, followedUsername) {
  try {
    const db = await dbPromise;
    const query = `
        DELETE FROM user_tracking
        WHERE telegram_id = ? AND followed_username = ?
      `;
    await db.run(query, [chatId, followedUsername]);
    await updateTrackedUsersData();
    return true;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return false;
  }
}

async function isUserAlreadyFollowing(ctx, followedUsername) {
  try {
    const db = await dbPromise;
    const chatId = ctx.from.id;
    const query = `
        SELECT COUNT(*) as count
        FROM user_tracking
        WHERE telegram_id = ? AND followed_username = ?
      `;
    const row = await db.get(query, [chatId, followedUsername]);
    return row.count > 0;
  } catch (error) {
    console.error("Error checking if user is already following:", error);
    return false;
  }
}

async function saveUserTrackingData(ctx) {
  try {
    const db = await dbPromise;
    const chatId = ctx.from.id;
    const { followedUsername, betAmount, variableBet, maxBetAmount, autoBetActive, currency } = ctx.session;
    const variableBetInt = variableBet ? 1 : 0;
    const autoBetActiveInt = autoBetActive ? 1 : 0;

    const insertQuery = `
        INSERT INTO user_tracking (telegram_id, followed_username, bet_amount, variable_bet, max_bet_amount, auto_bet_active, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

    await db.run(insertQuery, [chatId, followedUsername, betAmount, variableBetInt, maxBetAmount, autoBetActiveInt, currency]);
    await updateTrackedUsersData();
  } catch (error) {
    console.error("Error saving user tracking data:", error);
    throw new Error("An error has occurred while saving your data.");
  }
}

async function toggleUserAutoBet(chatId, followedUsername) {
  try {
    const db = await dbPromise;
    // On récupère l'état actuel de l'autobet
    const selectQuery = `
      SELECT auto_bet_active FROM user_tracking
      WHERE telegram_id = ? AND followed_username = ?
    `;
    const currentStatusRow = await db.get(selectQuery, [chatId, followedUsername]);
    if (!currentStatusRow) {
      return { success: false };
    }
    const currentStatus = currentStatusRow.auto_bet_active;
    const newStatus = currentStatus === 1 ? 0 : 1;

    const updateQuery = `
      UPDATE user_tracking
      SET auto_bet_active = ?
      WHERE telegram_id = ? AND followed_username = ?
    `;
    await db.run(updateQuery, [newStatus, chatId, followedUsername]);
    await updateTrackedUsersData();
    return { success: true, newStatus: newStatus === 1 ? "On" : "Off" };
  } catch (error) {
    console.error("Error toggling auto bet status:", error);
    throw error;
  }
}

async function updateTrackedUsersData() {
  const users = await fetchTrackedUsersData();
  updateTrackedUsersMap(users);
}

async function updateBetAmount(chatId, followedUsername, newBetAmount) {
  try {
    const db = await dbPromise;
    const updateQuery = `
      UPDATE user_tracking
      SET bet_amount = ?
      WHERE telegram_id = ? AND followed_username = ?
    `;
    await db.run(updateQuery, [newBetAmount, chatId, followedUsername]);
    await updateTrackedUsersData();
  } catch (error) {
    console.error("Error updating bet amount:", error);
    throw error;
  }
}

async function updateVariableBet(chatId, followedUsername, variableBet, maxBetAmount = null) {
  try {
    const db = await dbPromise;
    const updateQuery = `
      UPDATE user_tracking
      SET variable_bet = ?, max_bet_amount = ?
      WHERE telegram_id = ? AND followed_username = ?
    `;
    await db.run(updateQuery, [variableBet ? 1 : 0, maxBetAmount, chatId, followedUsername]);
    await updateTrackedUsersData();
  } catch (error) {
    console.error("Error updating variable bet:", error);
    throw error;
  }
}

async function updateCurrency(chatId, followedUsername, newCurrency) {
  try {
    const db = await dbPromise;
    const updateQuery = `
      UPDATE user_tracking
      SET currency = ?
      WHERE telegram_id = ? AND followed_username = ?
    `;
    await db.run(updateQuery, [newCurrency, chatId, followedUsername]);
    await updateTrackedUsersData();
  } catch (error) {
    console.error("Error updating currency:", error);
    throw error;
  }
}

async function getFollowedUserDetails(chatId, followedUsername) {
  try {
    const db = await dbPromise;
    const query = `
      SELECT followed_username AS username, bet_amount, variable_bet, max_bet_amount, auto_bet_active, currency
      FROM user_tracking
      WHERE telegram_id = ? AND followed_username = ?
    `;
    const user = await db.get(query, [chatId, followedUsername]);
    if (!user) {
      return null;
    }
    return {
      username: user.username,
      betAmount: parseFloat(user.bet_amount).toFixed(2),
      variableBet: user.variable_bet === 1,
      maxBetAmount: user.variable_bet ? parseFloat(user.max_bet_amount).toFixed(2) : "N/A",
      autoBetActive: user.auto_bet_active === 1 ? "ON" : "OFF",
      currency: user.currency,
    };
  } catch (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }
}

export const scenes = {
  userTrackingMenuScene,
  followUserScene,
  unfollowUserScene,
  toggleAutoBetScene,
  viewAllScene,
  userStatsScene,
  editUser,
};
