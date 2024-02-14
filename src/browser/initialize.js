import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function initializeBrowser() {
  return await puppeteer.launch({
    args: ["--enable-features=NetworkService", "--no-sandbox", "--disable-dev-shm-usage"],
    ignoreHTTPSErrors: true,
    headless: "new",
    timeout: 60000,
  });
}
