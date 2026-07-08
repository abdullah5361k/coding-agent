import type { LLMProvider } from "../llm/provider";
import type { ToolRegistry } from "../tools/registry";
import { Conversation } from "./conversation";

const SYSTEM_PROMPT =
  "You are a coding assistant working inside a project directory. " +
  "Use the available tools to explore the project and read files when you need them, then answer the user.";

const MAX_ITERATIONS = 10;

export type AgentEvent =
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; name: string; ok: boolean; detail: string }
  | { type: "tool_denied"; name: string }
  | { type: "compaction"; droppedTurns: number; tokensBefore: number; tokensAfter: number };

export type AgentEventHandler = (event: AgentEvent) => void;

export type ApprovalHandler = (
  name: string,
  args: Record<string, unknown>,
) => Promise<boolean>;

export class Agent {
  private conversation = new Conversation(SYSTEM_PROMPT);

  constructor(
    private provider: LLMProvider,
    private registry: ToolRegistry,
  ) {}

  async run(
    userMessage: string,
    onEvent?: AgentEventHandler,
    approve?: ApprovalHandler,
  ): Promise<string> {
    this.conversation.addUser(userMessage);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const compaction = this.conversation.compactIfNeeded();
      if (compaction) {
        onEvent?.({ type: "compaction", ...compaction });
      }

      const response = await this.provider.chat(
        this.conversation.messages(),
        this.registry.schemas(),
      );

      this.conversation.addAssistant(response.content, response.toolCalls);

      if (response.toolCalls.length === 0) {
        return response.content;
      }

      for (const call of response.toolCalls) {
        if (this.registry.get(call.name)?.requiresApproval) {
          const approved = (await approve?.(call.name, call.arguments)) ?? false;
          if (!approved) {
            onEvent?.({ type: "tool_denied", name: call.name });
            this.conversation.addToolResult(
              call.id,
              "Error: the user denied permission for this tool call. Do not retry it; ask the user how to proceed.",
            );
            continue;
          }
        }

        onEvent?.({ type: "tool_start", name: call.name, args: call.arguments });
        const result = await this.registry.execute(call.name, call.arguments);
        onEvent?.({
          type: "tool_end",
          name: call.name,
          ok: result.ok,
          detail: result.ok ? result.output : result.error,
        });
        this.conversation.addToolResult(
          call.id,
          result.ok ? result.output : `Error: ${result.error}`,
        );
      }
    }

    const notice = `I stopped after ${MAX_ITERATIONS} steps without finishing - this task may be too big for one go. Say "continue" and I'll pick up where I left off.`;
    this.conversation.addAssistant(notice);
    return notice;
  }
}
