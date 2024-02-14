import readline from 'readline';
import { updateValueInEnv } from '../update_env.js';

export async function checkAPI() {
  if (!process.env.API_KEY || process.env.API_KEY === ",") {
    await getAPIKey();
  }
}

async function getAPIKey() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Veuillez entrer votre clé API: ", (inputApiKey) => {
      updateValueInEnv("API_KEY", inputApiKey);
      rl.close();
      resolve(inputApiKey);
    });
  });
}