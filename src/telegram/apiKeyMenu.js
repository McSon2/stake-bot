import { Scenes } from "telegraf";
import dbPromise from "../database/connection.js";

const addApiKeyScene = new Scenes.BaseScene("ADD_API_KEY_SCENE");
const editApiKeyScene = new Scenes.BaseScene("EDIT_API_KEY_SCENE");
const myApiKeyScene = new Scenes.BaseScene("MY_API_KEY_SCENE");
const apiKeyMenuScene = new Scenes.BaseScene("API_KEY_SCENE");
const BACK_ACTION = "Back";

const States = {
  WAITING_FOR_USERNAME: "WAITING_FOR_STAKE_USERNAME",
  WAITING_FOR_KEY: "WAITING_FOR_API_KEY",
};

const handleBackAction = (sceneName) => (ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.trim() === BACK_ACTION) {
    ctx.scene.enter(sceneName);
  } else {
    return next();
  }
};

async function askForInput(ctx, message) {
  await ctx.reply(message);
  ctx.session.nextState = ctx.session.state === States.WAITING_FOR_USERNAME ? States.WAITING_FOR_KEY : null;
}

async function handleApiKeyResponse(ctx) {
  const result = ctx.session.hasApiKey ? await updateApiKeyInDatabase(ctx) : await storeApiKeyInDatabase(ctx);
  await ctx.reply(result.message);
  if (result.success) ctx.scene.enter("API_KEY_SCENE");
  else ctx.reply("Please try again or type /cancel to exit.");
}

const keyboards = {
  main: { reply_markup: { keyboard: [["Add API Key", "Edit API Key"], ["My API Key"], ["Back"]], resize_keyboard: true } },
};

apiKeyMenuScene.enter((ctx) => ctx.reply("Manage your API key:", keyboards.main));
apiKeyMenuScene.hears("Add API Key", (ctx) => ctx.scene.enter("ADD_API_KEY_SCENE"));
apiKeyMenuScene.hears("Edit API Key", (ctx) => ctx.scene.enter("EDIT_API_KEY_SCENE"));
apiKeyMenuScene.hears("My API Key", (ctx) => ctx.scene.enter("MY_API_KEY_SCENE"));
apiKeyMenuScene.hears("Back", (ctx) => ctx.scene.enter("MAIN_MENU_SCENE"));
addApiKeyScene.use(handleBackAction("API_KEY_SCENE"));
editApiKeyScene.use(handleBackAction("API_KEY_SCENE"));
myApiKeyScene.use(handleBackAction("API_KEY_SCENE"));

addApiKeyScene.enter(async (ctx) => {
  ctx.session.hasApiKey = await checkExistingApiKey(ctx);
  if (ctx.session.hasApiKey) {
    await ctx.reply("An API key already exists for your account. Please use the 'Edit API Key' option to update it.");
    await ctx.scene.enter("API_KEY_SCENE");
  } else {
    ctx.session.state = States.WAITING_FOR_USERNAME;
    await askForInput(ctx, "Please enter your Stake username:");
  }
});

editApiKeyScene.enter((ctx) => {
  ctx.session.hasApiKey = checkExistingApiKey(ctx);
  ctx.session.state = States.WAITING_FOR_KEY;
  askForInput(ctx, "Please enter your new API key for the update::");
});

myApiKeyScene.enter(async (ctx) => {
  await displayApiKey(ctx);
  ctx.scene.enter("API_KEY_SCENE");
});

async function textHandler(ctx) {
  if (ctx.session.state === States.WAITING_FOR_USERNAME) {
    ctx.session.stakeUsername = ctx.message.text;
    ctx.session.state = States.WAITING_FOR_KEY;
    await askForInput(ctx, "Please enter your API key:");
  } else if (ctx.session.state === States.WAITING_FOR_KEY) {
    await handleApiKeyResponse(ctx);
  }
}

addApiKeyScene.on("text", textHandler);
editApiKeyScene.on("text", textHandler);

// FUNCTION
async function displayApiKey(ctx) {
  const chatId = ctx.chat.id;

  try {
    const db = await dbPromise;
    const sql = "SELECT api_key FROM apikey WHERE telegram_id = ?";
    const row = await db.get(sql, chatId);

    if (!row) {
      ctx.reply("No API key found for your account.");
    } else {
      const decryptedApiKey = row.api_key; // Ici, pas de déchiffrement
      ctx.reply(`Your API key is: ${decryptedApiKey}`);
    }
  } catch (error) {
    console.error("Error retrieving API key:", error);
    ctx.reply("An error occurred while retrieving your API key.");
  }
}

async function storeApiKeyInDatabase(ctx) {
  const { id: telegramId } = ctx.from;
  const { stakeUsername } = ctx.session;
  const apiKey = ctx.message.text;
  try {
    const db = await dbPromise;
    const insertSql = `
      INSERT INTO apikey (telegram_id, stake_username, api_key) 
      VALUES (?, ?, ?)
    `;
    await db.run(insertSql, [telegramId, stakeUsername, apiKey]);
    return { success: true, message: "Your API key has been stored successfully." };
  } catch (error) {
    console.error("Error storing API key: ", error);
    return { success: false, message: "There was an error storing your API key." };
  }
}

async function updateApiKeyInDatabase(ctx) {
  const telegramId = ctx.from.id;
  const newApiKey = ctx.message.text;
  try {
    const db = await dbPromise;
    const sql = `
      UPDATE apikey 
      SET api_key = ? 
      WHERE telegram_id = ?
    `;
    const result = await db.run(sql, [newApiKey, telegramId]);
    if (result.changes === 0) {
      return { success: false, message: "No record found to update." };
    } else {
      return { success: true, message: "Your API key has been successfully updated." };
    }
  } catch (error) {
    console.error("Error updating API key:", error);
    return { success: false, message: "An error occurred while updating your API key." };
  }
}

async function checkExistingApiKey(ctx) {
  const chatId = ctx.chat.id;
  try {
    const db = await dbPromise;
    const checkSql = "SELECT COUNT(*) AS count FROM apikey WHERE telegram_id = ?";
    const row = await db.get(checkSql, chatId);
    return row.count > 0;
  } catch (error) {
    console.error("Error checking for existing API key: ", error);
    await ctx.reply("An error occurred while checking for an existing API key.");
    return false;
  }
}

// Exportez stage pour pouvoir l'utiliser dans le fichier principal de votre bot
export const scenes = {
  apiKeyMenuScene,
  addApiKeyScene,
  editApiKeyScene,
  myApiKeyScene,
};
