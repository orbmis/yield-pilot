import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const portfolio = JSON.parse(readFileSync(resolve("fixtures/portfolio.json"), "utf8"));
const opportunities = JSON.parse(readFileSync(resolve("fixtures/opportunities.json"), "utf8"));

console.log(JSON.stringify({ portfolio, opportunities }, null, 2));
