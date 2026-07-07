import type { Tool, ToolResult } from "./tool";

export type ToolSchema = Pick<Tool, "name" | "description" | "parameters">;

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      const available = [...this.tools.keys()].join(", ") || "none";
      return {
        ok: false,
        error: `Unknown tool "${name}". Available tools: ${available}`,
      };
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Tool "${name}" failed: ${detail}` };
    }
  }

  schemas(): ToolSchema[] {
    return [...this.tools.values()].map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }
}
