import { getTrendingAnime } from "./src/lib/consumet.js";

async function run() {
  console.log("Fetching trending anime...");
  const data = await getTrendingAnime();
  console.log("Result:", data ? `Success! Found ${data.results.length} items.` : "Failed.");
  if (data?.results?.length) {
    console.log("First item:", data.results[0].title);
  }
}

run();
