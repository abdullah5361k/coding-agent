import { readFile } from "node:fs/promises";
import { resolveInsideCwd } from "./safe-path";
import type { Tool } from "./tool";

const MAX_CHARS = 8_000;

function capContents(text: string, path: string): string {
  if (text.length <= MAX_CHARS) {
    return text;
  }
  // Cut at a line boundary so the model never sees a half line.
  const cutAt = text.lastIndexOf("\n", MAX_CHARS);
  const shown = text.slice(0, cutAt > 0 ? cutAt : MAX_CHARS);
  const shownLines = shown.split("\n").length;
  const totalLines = text.split("\n").length;
  return (
    `${shown}\n` +
    `... [truncated: showing first ${shownLines} of ${totalLines} lines. ` +
    `Use run_shell with e.g. sed -n '${shownLines + 1},${shownLines + 200}p' ${path} to read more]`
  );
}

export const readFileTool: Tool = {
  name: "read_file",
  description:
    "Read a single text file and return its contents. Use this when you need to see what is inside a specific file. The path must be relative to the project root, e.g. \"src/index.ts\". Very large files are truncated with a note saying how to read the rest. For directories, use list_files instead.",
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
  requiresApproval: false,

  async execute(args) {
    const checked = resolveInsideCwd(args);
    if (!checked.ok) {
      return { ok: false, error: checked.error };
    }

    try {
      const text = await readFile(checked.absolute, "utf8");
      return { ok: true, output: capContents(text, String(args.path)) };
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
