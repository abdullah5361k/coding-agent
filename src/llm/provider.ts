export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: unknown;
}

export type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; content: string; toolCallId: string };

export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
}

export interface LLMProvider {
  chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse>;
}
