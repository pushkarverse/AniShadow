import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";

async function postSearchNovelLive(query) {
  const url = "https://novellive.com/search/";
  console.log(`POST Searching NovelLive for "${query}"`);
  try {
    const res = await gotScraping({
      url,
      method: "POST",
      form: { searchkey: query },
      http2: false
    });
    console.log("Status Code:", res.statusCode);
    const $ = cheerio.load(res.body);
    const results = [];
    $('.list-truyen .row').each((idx, el) => {
      const titleEl = $(el).find('h3.truyen-title a');
      const title = titleEl.text().trim();
      const href = titleEl.attr('href') || '';
      const id = href.replace('.html', '').replace(/^\//, '');
      if (title) {
        results.push({ title, id, href });
      }
    });
    console.log("Found Results:", results);
  } catch (err) {
    console.error("Error searching NovelLive:", err.message);
  }
}

async function run() {
  await postSearchNovelLive("Path of the Extra");
  await postSearchNovelLive("The Return of the Iron-blood Sword Hound");
}

run();
