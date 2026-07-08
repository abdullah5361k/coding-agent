import type { AgentEvent } from "../agent/agent";

function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}...`;
}

export class Renderer {
  readonly prompt = "you> ";

  readonly onEvent = (event: AgentEvent): void => {
    switch (event.type) {
      case "tool_start":
        console.log(`  -> ${event.name} ${JSON.stringify(event.args)}`);
        break;
      case "tool_end":
        if (event.ok) {
          console.log(`  ok ${event.name} (${event.detail.length} chars)`);
        } else {
          console.log(`  !! ${event.name}: ${truncate(event.detail, 120)}`);
        }
        break;
      case "tool_denied":
        console.log(`  -- ${event.name} denied`);
        break;
      case "compaction":
        console.log(
          `  ~~ compacted history: dropped ${event.droppedTurns} old turn(s), ~${event.tokensBefore} -> ~${event.tokensAfter} tokens`,
        );
        break;
    }
  };

  approvalPrompt(name: string, args: Record<string, unknown>): string {
    if (
      name === "edit_file" &&
      typeof args.old_string === "string" &&
      typeof args.new_string === "string"
    ) {
      const removed = args.old_string.split("\n").map((l) => `  - ${l}`);
      const added = args.new_string === ""
        ? []
        : args.new_string.split("\n").map((l) => `  + ${l}`);
      return [
        `  edit_file wants to change ${args.path}:`,
        ...removed,
        ...added,
        "  allow? [y/N] ",
      ].join("\n");
    }
    return `  ${name} wants to run with ${JSON.stringify(args)}\n  allow? [y/N] `;
  }

  showWelcome(): void {
    console.log("coding-agent - type a question, /exit or Ctrl-D to quit\n");
  }

  showAnswer(answer: string): void {
    console.log(`\n${answer}\n`);
  }

  showError(error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`\nerror: ${detail}\n`);
  }

  showGoodbye(): void {
    console.log("bye");
  }
}
