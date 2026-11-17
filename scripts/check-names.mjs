import { findCountryByGuess } from "../src/lib/countries.ts";

const guesses = [
  "INDONESIA", "indonesia", "USA", "U.S.A.", "UK", "United Kingdom",
  "Côte d’Ivoire", "cote d ivoire", "South Korea", "DRC", "Russia",
  "Türkiye", "the Netherlands", "Palestine", "Kosovo", "Atlantis",
];

for (const guess of guesses) {
  const country = findCountryByGuess(guess);
  console.log(guess.padEnd(20), "->", country ? `${country.name} (${country.cca3})` : "INVALID");
}
