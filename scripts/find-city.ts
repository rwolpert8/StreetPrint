import { searchCities } from "../src/lib/city-search";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error('Use npm run cities:find -- "Washington United States"');
  process.exitCode = 1;
} else {
  const results = searchCities(query, 8);
  if (!results.length) {
    console.error("No matching city. Try another spelling, or add a smaller city manually as described in docs/CITY-CATALOGUE.md.");
    process.exitCode = 1;
  } else {
    for (const { id, name, country, countryCode, region, continent, latitude, longitude } of results) {
      console.log(JSON.stringify({ id, name, country, countryCode, region, continent, latitude, longitude, aliases: [] }, null, 2));
    }
  }
}
