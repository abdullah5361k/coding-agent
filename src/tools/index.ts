import { listFilesTool } from "./list-files";
import { readFileTool } from "./read-file";
import { ToolRegistry } from "./registry";

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(readFileTool);
  registry.register(listFilesTool);
  return registry;
}
