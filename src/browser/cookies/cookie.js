import { getBrowserInstance } from '../context.js';
import { writeToLog } from '../../utils/log.js';
import { delay } from '../../utils/delay.js';
import { updateValueInEnv } from '../update_env.js';
import { load } from 'cheerio';

export async function checkCookies() {
  if (!process.env.COOKIE_STAKE || process.env.COOKIE_STAKE === ",") {
    await fetchCookies();
  }
}

export async function fetchCookies() {
  console.log("Starting cookie fetch process...");

  try {
    const browser = getBrowserInstance();
    
    if (!browser) {
      writeToLog("Erreur: Instance du navigateur non trouvée.");
      return;
    }

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36");
    await page.goto("https://stake.bet", { waitUntil: "networkidle0" });
    await delay(5000);
    await page.screenshot({ path: "screenshot.png" });
    console.log("Page opened successfully.");

    let newUrl = undefined;
    const startingTime = Date.now();

    while (!newUrl && Date.now() - startingTime < 120 * 1000) {
      console.log("Checking for game URL or captcha...");

      try {
        const html = await page.content();
        const $j = load(html);
        newUrl = $j("#game").attr("src");

        // If game URL is not found
        if (!newUrl) {
          console.log("Game URL not found. Checking for captcha...");

          const captchaButton = await page.$('input[type="checkbox"]');
          const casinoSpan = await page.$(
            "span.weight-semibold.line-height-default.align-left.size-md.text-size-md.variant-highlighted.with-icon-space.svelte-1myjzud"
          );
          const captchaDiv = await page.$("div.captcha");

          if (captchaDiv) {
            console.log("Captcha div found.");

            await delay(3000);

            await page.click("body");

            await delay(1000);

            await page.keyboard.press("Tab");

            await delay(1000);

            await page.keyboard.press("Space");

            await delay(5000);
          } else if (casinoSpan) {
            console.log("Page loaded successfully without captcha.");
            newUrl = true;
          }
        }
      } catch (e) {
        console.error("Error during captcha handling: ", e);
      }
    }

    if (newUrl) {
      const cookies = await page.cookies();
      console.log("Cookies retrieved");

      for (let cookie of cookies) {
        if (cookie.name === "__cf_bm") {
          updateValueInEnv("COOKIE_STAKE", cookie.value);
          console.log("Required cookie found and saved:", cookie);
          break;
        }
      }
    }

    await page.close();
    console.log("Browser closed.");
  } catch (err) {
    console.error("Error in fetchCookies function:", err);
    writeToLog(`Erreur dans fetchCookies: ${err}`);
  }
}
