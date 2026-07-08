import { editFileTool } from "./edit-file";
import { listFilesTool } from "./list-files";
import { readFileTool } from "./read-file";
import { ToolRegistry } from "./registry";
import { runShellTool } from "./run-shell";
import { writeFileTool } from "./write-file";

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(readFileTool);
  registry.register(listFilesTool);
  registry.register(writeFileTool);
  registry.register(editFileTool);
  registry.register(runShellTool);
  return registry;
}
