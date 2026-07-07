export interface ToolParameters {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export type ToolResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}
