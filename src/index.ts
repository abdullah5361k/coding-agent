import { Agent } from "./agent/agent";
import { Renderer } from "./cli/renderer";
import { startRepl } from "./cli/repl";
import { GroqProvider } from "./llm/groq";
import { createToolRegistry } from "./tools";

const agent = new Agent(new GroqProvider(), createToolRegistry());
const renderer = new Renderer();

await startRepl(agent, renderer);
