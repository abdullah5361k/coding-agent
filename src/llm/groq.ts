import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { config } from "../config/config";
import type { ChatResponse, LLMProvider, Message } from "./provider";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export class GroqProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(model: string = config.model) {
    this.model = model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: GROQ_BASE_URL,
    });
  }

  async chat(messages: Message[]): Promise<ChatResponse> {
    const groqMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        messages: groqMessages,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Groq chat request failed: ${detail}`, { cause: error });
    }

    const content = response.choices[0]?.message?.content;
    if (content == null) {
      throw new Error("Groq chat request failed: response contained no content");
    }

    return { content };
  }
}
