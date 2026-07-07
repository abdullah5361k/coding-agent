import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error(
    "Missing API_KEY. Add it to your .env file or set it in the environment.",
  );
}

export interface Config {
  apiKey: string;
  model: string;
  cwd: string;
}

export const config: Config = {
  apiKey,
  model: process.env.MODEL ?? "llama-3.3-70b-versatile",
  cwd: process.cwd(),
};
