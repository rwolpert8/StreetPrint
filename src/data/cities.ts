import definitions from "../../puzzles.json";

export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania";

export type City = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  continent: Continent;
  latitude: number;
  longitude: number;
  aliases: string[];
};

// A deliberately small, hand-curated search catalogue, independent of puzzles.
// Coordinates are approximate reference points, not administrative centroids.
// Before scoring/launch, review these anchors and replace/expand this catalogue.
const extraCities: City[] = [
  { id: "us-paris-tx", name: "Paris", region: "Texas", country: "United States", countryCode: "us", continent: "North America", latitude: 33.6609, longitude: -95.5555, aliases: [] },
  { id: "gb-london", name: "London", country: "United Kingdom", countryCode: "gb", continent: "Europe", latitude: 51.5074, longitude: -0.1278, aliases: [] },
  { id: "fr-lyon", name: "Lyon", country: "France", countryCode: "fr", continent: "Europe", latitude: 45.7640, longitude: 4.8357, aliases: ["Lyons"] },
  { id: "fr-marseille", name: "Marseille", country: "France", countryCode: "fr", continent: "Europe", latitude: 43.2965, longitude: 5.3698, aliases: ["Marseilles"] },
  { id: "fr-nice", name: "Nice", country: "France", countryCode: "fr", continent: "Europe", latitude: 43.7102, longitude: 7.2620, aliases: [] },
  { id: "es-madrid", name: "Madrid", country: "Spain", countryCode: "es", continent: "Europe", latitude: 40.4168, longitude: -3.7038, aliases: [] },
  { id: "pt-lisbon", name: "Lisbon", country: "Portugal", countryCode: "pt", continent: "Europe", latitude: 38.7223, longitude: -9.1393, aliases: ["Lisboa"] },
  { id: "pt-porto", name: "Porto", country: "Portugal", countryCode: "pt", continent: "Europe", latitude: 41.1579, longitude: -8.6291, aliases: ["Oporto"] },
  { id: "de-berlin", name: "Berlin", country: "Germany", countryCode: "de", continent: "Europe", latitude: 52.5200, longitude: 13.4050, aliases: [] },
  { id: "de-munich", name: "Munich", country: "Germany", countryCode: "de", continent: "Europe", latitude: 48.1351, longitude: 11.5820, aliases: ["München", "Munchen"] },
  { id: "it-rome", name: "Rome", country: "Italy", countryCode: "it", continent: "Europe", latitude: 41.9028, longitude: 12.4964, aliases: ["Roma"] },
  { id: "it-venice", name: "Venice", country: "Italy", countryCode: "it", continent: "Europe", latitude: 45.4408, longitude: 12.3155, aliases: ["Venezia"] },
  { id: "nl-amsterdam", name: "Amsterdam", country: "Netherlands", countryCode: "nl", continent: "Europe", latitude: 52.3676, longitude: 4.9041, aliases: [] },
  { id: "cz-prague", name: "Prague", country: "Czechia", countryCode: "cz", continent: "Europe", latitude: 50.0755, longitude: 14.4378, aliases: ["Praha"] },
  { id: "at-vienna", name: "Vienna", country: "Austria", countryCode: "at", continent: "Europe", latitude: 48.2082, longitude: 16.3738, aliases: ["Wien"] },
  { id: "us-boston", name: "Boston", country: "United States", countryCode: "us", continent: "North America", latitude: 42.3601, longitude: -71.0589, aliases: [] },
  { id: "us-chicago", name: "Chicago", country: "United States", countryCode: "us", continent: "North America", latitude: 41.8781, longitude: -87.6298, aliases: [] },
  { id: "us-san-francisco", name: "San Francisco", country: "United States", countryCode: "us", continent: "North America", latitude: 37.7749, longitude: -122.4194, aliases: ["SF"] },
  { id: "us-los-angeles", name: "Los Angeles", country: "United States", countryCode: "us", continent: "North America", latitude: 34.0522, longitude: -118.2437, aliases: ["LA"] },
  { id: "us-portland-or", name: "Portland", region: "Oregon", country: "United States", countryCode: "us", continent: "North America", latitude: 45.5152, longitude: -122.6784, aliases: [] },
  { id: "ca-toronto", name: "Toronto", country: "Canada", countryCode: "ca", continent: "North America", latitude: 43.6532, longitude: -79.3832, aliases: [] },
  { id: "ca-montreal", name: "Montréal", country: "Canada", countryCode: "ca", continent: "North America", latitude: 45.5019, longitude: -73.5674, aliases: ["Montreal"] },
  { id: "mx-mexico-city", name: "Mexico City", country: "Mexico", countryCode: "mx", continent: "North America", latitude: 19.4326, longitude: -99.1332, aliases: ["Ciudad de México", "CDMX"] },
  { id: "br-sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "br", continent: "South America", latitude: -23.5505, longitude: -46.6333, aliases: ["Sao Paulo"] },
  { id: "ar-buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "ar", continent: "South America", latitude: -34.6037, longitude: -58.3816, aliases: [] },
  { id: "pe-lima", name: "Lima", country: "Peru", countryCode: "pe", continent: "South America", latitude: -12.0464, longitude: -77.0428, aliases: [] },
  { id: "eg-cairo", name: "Cairo", country: "Egypt", countryCode: "eg", continent: "Africa", latitude: 30.0444, longitude: 31.2357, aliases: ["Al Qahirah"] },
  { id: "za-cape-town", name: "Cape Town", country: "South Africa", countryCode: "za", continent: "Africa", latitude: -33.9249, longitude: 18.4241, aliases: ["Kaapstad"] },
  { id: "ke-nairobi", name: "Nairobi", country: "Kenya", countryCode: "ke", continent: "Africa", latitude: -1.2921, longitude: 36.8219, aliases: [] },
  { id: "in-mumbai", name: "Mumbai", country: "India", countryCode: "in", continent: "Asia", latitude: 19.0760, longitude: 72.8777, aliases: ["Bombay"] },
  { id: "in-delhi", name: "Delhi", country: "India", countryCode: "in", continent: "Asia", latitude: 28.6139, longitude: 77.2090, aliases: [] },
  { id: "cn-beijing", name: "Beijing", country: "China", countryCode: "cn", continent: "Asia", latitude: 39.9042, longitude: 116.4074, aliases: ["Peking", "北京"] },
  { id: "cn-shanghai", name: "Shanghai", country: "China", countryCode: "cn", continent: "Asia", latitude: 31.2304, longitude: 121.4737, aliases: ["上海"] },
  { id: "kr-seoul", name: "Seoul", country: "South Korea", countryCode: "kr", continent: "Asia", latitude: 37.5665, longitude: 126.9780, aliases: ["서울"] },
  { id: "th-bangkok", name: "Bangkok", country: "Thailand", countryCode: "th", continent: "Asia", latitude: 13.7563, longitude: 100.5018, aliases: ["Krung Thep"] },
  { id: "sg-singapore", name: "Singapore", country: "Singapore", countryCode: "sg", continent: "Asia", latitude: 1.3521, longitude: 103.8198, aliases: [] },
  { id: "au-melbourne", name: "Melbourne", country: "Australia", countryCode: "au", continent: "Oceania", latitude: -37.8136, longitude: 144.9631, aliases: [] },
  { id: "au-perth", name: "Perth", country: "Australia", countryCode: "au", continent: "Oceania", latitude: -31.9523, longitude: 115.8613, aliases: [] },
  { id: "nz-auckland", name: "Auckland", country: "New Zealand", countryCode: "nz", continent: "Oceania", latitude: -36.8485, longitude: 174.7633, aliases: [] },
];

// Enabled puzzle cities automatically join search and override matching catalogue entries.
const catalogue = new Map(extraCities.map((city) => [city.id, city]));
for (const puzzle of definitions.puzzles.filter((item) => item.enabled)) {
  catalogue.set(puzzle.city.id, puzzle.city as City);
}
export const cities: City[] = [...catalogue.values()];
