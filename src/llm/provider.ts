export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatResponse {
  content: string;
}

export interface LLMProvider {
  chat(messages: Message[]): Promise<ChatResponse>;
}
