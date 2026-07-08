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
  /** Tools that change anything must be approved by the user before each run. */
  requiresApproval: boolean;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}
