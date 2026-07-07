import { readFile } from "node:fs/promises";
import { resolveInsideCwd } from "./safe-path";
import type { Tool } from "./tool";

export const readFileTool: Tool = {
  name: "read_file",
  description:
    "Read a single text file and return its full contents. Use this when you need to see what is inside a specific file. The path must be relative to the project root, e.g. \"src/index.ts\". For directories, use list_files instead.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to the project root",
      },
    },
    required: ["path"],
  },

  async execute(args) {
    const checked = resolveInsideCwd(args);
    if (!checked.ok) {
      return { ok: false, error: checked.error };
    }

    try {
      const text = await readFile(checked.absolute, "utf8");
      return { ok: true, output: text };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return { ok: false, error: `No such file: ${args.path}` };
      }
      if (code === "EISDIR") {
        return {
          ok: false,
          error: `"${args.path}" is a directory. Use list_files to see its contents.`,
        };
      }
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Could not read "${args.path}": ${detail}` };
    }
  },
};
