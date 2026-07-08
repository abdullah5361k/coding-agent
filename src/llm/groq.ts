import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { config } from "../config/config";
import type {
  ChatResponse,
  LLMProvider,
  Message,
  ToolCall,
  ToolDefinition,
} from "./provider";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// Groq returns 400/tool_use_failed when the model itself emits a malformed
// tool call; a re-sample usually produces a well-formed one.
const MAX_TOOL_USE_RETRIES = 2;

function isToolUseFailure(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIError &&
    typeof error.error === "object" &&
    error.error !== null &&
    (error.error as { code?: unknown }).code === "tool_use_failed"
  );
}

function toGroqMessage(message: Message): ChatCompletionMessageParam {
  switch (message.role) {
    case "system":
    case "user":
      return { role: message.role, content: message.content };
    case "assistant":
      if (message.toolCalls && message.toolCalls.length > 0) {
        return {
          role: "assistant",
          content: message.content || null,
          tool_calls: message.toolCalls.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments),
            },
          })),
        };
      }
      return { role: "assistant", content: message.content };
    case "tool":
      return {
        role: "tool",
        content: message.content,
        tool_call_id: message.toolCallId,
      };
  }
}

function toGroqTool(tool: ToolDefinition): ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    },
  };
}

function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through: malformed arguments become an empty object, and the
    // tool's own input validation reports what was missing
  }
  return {};
}

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

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    let response: OpenAI.Chat.Completions.ChatCompletion;
    for (let attempt = 0; ; attempt++) {
      try {
        response = await this.client.chat.completions.create({
          model: this.model,
          messages: messages.map(toGroqMessage),
          ...(tools && tools.length > 0 ? { tools: tools.map(toGroqTool) } : {}),
        });
        break;
      } catch (error) {
        if (isToolUseFailure(error) && attempt < MAX_TOOL_USE_RETRIES) {
          continue;
        }
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Groq chat request failed: ${detail}`, { cause: error });
      }
    }

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("Groq chat request failed: response contained no message");
    }

    const toolCalls: ToolCall[] = (message.tool_calls ?? [])
      .filter((call) => call.type === "function")
      .map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: parseArguments(call.function.arguments),
      }));

    return { content: message.content ?? "", toolCalls };
  }
}
