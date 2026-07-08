import type { Message, ToolCall } from "../llm/provider";

// Rough heuristic: ~4 chars per token, plus per-message wrapping overhead.
const CHARS_PER_TOKEN = 4;
const MESSAGE_OVERHEAD_TOKENS = 8;

// The real window (llama 3.3 on Groq) is 128k tokens; compact far below it so
// there is always room for tool schemas, the reply, and estimation error.
const DEFAULT_THRESHOLD_TOKENS = 12_000;
const DEFAULT_TARGET_TOKENS = 8_000;

export interface CompactionLimits {
  thresholdTokens?: number;
  targetTokens?: number;
}

export interface CompactionReport {
  droppedTurns: number;
  tokensBefore: number;
  tokensAfter: number;
}

export function estimateMessageTokens(message: Message): number {
  let chars = message.content.length;
  if (message.role === "assistant" && message.toolCalls) {
    chars += JSON.stringify(message.toolCalls).length;
  }
  return Math.ceil(chars / CHARS_PER_TOKEN) + MESSAGE_OVERHEAD_TOKENS;
}

/**
 * Holds the message history as a pinned system prompt plus a list of turns.
 * A turn is one user message and every assistant/tool message produced while
 * answering it, so dropping whole turns can never separate an assistant
 * tool call from its tool result.
 */
export class Conversation {
  private readonly system: Message;
  private turns: Message[][] = [];
  private readonly thresholdTokens: number;
  private readonly targetTokens: number;

  constructor(systemPrompt: string, limits?: CompactionLimits) {
    this.system = { role: "system", content: systemPrompt };
    this.thresholdTokens = limits?.thresholdTokens ?? DEFAULT_THRESHOLD_TOKENS;
    this.targetTokens = limits?.targetTokens ?? DEFAULT_TARGET_TOKENS;
  }

  addUser(content: string): void {
    this.turns.push([{ role: "user", content }]);
  }

  addAssistant(content: string, toolCalls?: ToolCall[]): void {
    this.currentTurn().push({
      role: "assistant",
      content,
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
    });
  }

  addToolResult(toolCallId: string, content: string): void {
    this.currentTurn().push({ role: "tool", content, toolCallId });
  }

  messages(): Message[] {
    return [this.system, ...this.turns.flat()];
  }

  estimateTokens(): number {
    return this.messages().reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  }

  /**
   * Sliding window: when the estimate crosses the threshold, drop the oldest
   * turns until under the target. The system prompt and the current turn are
   * never dropped.
   */
  compactIfNeeded(): CompactionReport | null {
    const tokensBefore = this.estimateTokens();
    if (tokensBefore <= this.thresholdTokens) {
      return null;
    }

    let droppedTurns = 0;
    while (this.turns.length > 1 && this.estimateTokens() > this.targetTokens) {
      this.turns.shift();
      droppedTurns += 1;
    }

    return { droppedTurns, tokensBefore, tokensAfter: this.estimateTokens() };
  }

  private currentTurn(): Message[] {
    const turn = this.turns[this.turns.length - 1];
    if (!turn) {
      throw new Error("Conversation has no turn yet: call addUser first");
    }
    return turn;
  }
}
