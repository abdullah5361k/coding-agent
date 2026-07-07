import { config } from "./config/config";
import { GroqProvider } from "./llm/groq";
import type { LLMProvider } from "./llm/provider";

const provider: LLMProvider = new GroqProvider();

const response = await provider.chat([
  { role: "user", content: "Say hello in one short sentence." },
]);

console.log(`[${config.model}] ${response.content}`);
