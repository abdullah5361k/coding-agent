import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveInsideCwd } from "./safe-path";
import type { Tool } from "./tool";

export const writeFileTool: Tool = {
  name: "write_file",
  description:
    "Create a file or completely replace its contents. Use this for new files or full rewrites; for a small change inside an existing file, use edit_file instead. The path must be relative to the project root. Parent directories are created if needed.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to the project root",
      },
      content: {
        type: "string",
        description: "The full content the file should have",
      },
    },
    required: ["path", "content"],
  },
  requiresApproval: true,

  async execute(args) {
    const checked = resolveInsideCwd(args);
    if (!checked.ok) {
      return { ok: false, error: checked.error };
    }
    if (typeof args.content !== "string") {
      return {
        ok: false,
        error: 'Missing or invalid "content" argument: expected a string.',
      };
    }

    try {
      await mkdir(dirname(checked.absolute), { recursive: true });
      await writeFile(checked.absolute, args.content, "utf8");
      return {
        ok: true,
        output: `Wrote ${Buffer.byteLength(args.content, "utf8")} bytes to ${args.path}`,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Could not write "${args.path}": ${detail}` };
    }
  },
};
