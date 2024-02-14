import { getBrowserInstance } from './context.js';
import dotenv from 'dotenv';
dotenv.config();

const pagePool = [];
const PAGE_POOL_SIZE = 8;
const PAGE_LIFE_SPAN = 30 * 60 * 1000;

const HEADERS = {
  accept: "*/*",
  "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  "content-type": "application/json",
  Cookie: "__cf_bm=" + process.env.COOKIE_STAKE,
  origin: "https://stake.bet",
  pragma: "no-cache",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "x-access-token": process.env.API_KEY,
};

export async function getPageFromPool() {
  const browserInstance = getBrowserInstance();
  if (pagePool.length) {
    const { page, timeout } = pagePool.pop();
    clearTimeout(timeout);
    return page;
  }
  return browserInstance.newPage();
}

export function returnPageToPool(page) {
  if (pagePool.length < PAGE_POOL_SIZE) {
    const timeout = setTimeout(() => {
      page.close();
      pagePool.splice(pagePool.indexOf(page), 1);
    }, PAGE_LIFE_SPAN);

    pagePool.push({ page, timeout });
  } else {
    page.close();
  }
}

export async function fetchAndClose(url, requestData) {
  const page = await getPageFromPool();

  try {
    await page.setRequestInterception(true);
    page.once("request", (interceptedRequest) => {
      interceptedRequest.continue({
        method: "POST",
        postData: JSON.stringify(requestData),
        headers: { ...interceptedRequest.headers(), ...HEADERS },
      });
    });

    const response = await page.goto(url, {
      timeout: 10000,
      waitUntil: ["domcontentloaded", "load"],
    });
    await page.waitForTimeout(2000);
    const data = await response.text();
    //console.log(data);
    returnPageToPool(page); // Retourne la page au pool

    return JSON.parse(data);
  } catch (error) {
    await page.close(); // Ferme la page en cas d'erreur
    throw error;
  }
}