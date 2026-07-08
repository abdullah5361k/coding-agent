import { createInterface } from "node:readline/promises";
import type { Agent, ApprovalHandler } from "../agent/agent";
import type { Renderer } from "./renderer";

export async function startRepl(agent: Agent, renderer: Renderer): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const approve: ApprovalHandler = async (name, args) => {
    try {
      const answer = await rl.question(renderer.approvalPrompt(name, args));
      const normalized = answer.trim().toLowerCase();
      return normalized === "y" || normalized === "yes";
    } catch {
      // stdin closed while waiting for an answer: treat as denied
      return false;
    }
  };

  renderer.showWelcome();

  while (true) {
    let line: string;
    try {
      line = await rl.question(renderer.prompt);
    } catch {
      // stdin closed (Ctrl-D) while waiting for input
      break;
    }

    const input = line.trim();
    if (input === "") {
      continue;
    }
    if (input === "/exit") {
      break;
    }

    try {
      const answer = await agent.run(input, renderer.onEvent, approve);
      renderer.showAnswer(answer);
    } catch (error) {
      renderer.showError(error);
    }
  }

  rl.close();
  renderer.showGoodbye();
}
