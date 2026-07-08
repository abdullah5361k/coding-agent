import { readFile, writeFile } from "node:fs/promises";
import { resolveInsideCwd } from "./safe-path";
import type { Tool } from "./tool";

function countOccurrences(text: string, search: string): number {
  let count = 0;
  let index = text.indexOf(search);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(search, index + search.length);
  }
  return count;
}

export const editFileTool: Tool = {
  name: "edit_file",
  description:
    "Make a targeted change inside an existing file by replacing one exact string with another. old_string must appear exactly once in the file - include enough surrounding lines to make it unique. For new files or full rewrites, use write_file instead.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to the project root",
      },
      old_string: {
        type: "string",
        description: "The exact text to replace; must match exactly one spot in the file",
      },
      new_string: {
        type: "string",
        description: "The text to replace it with (may be empty to delete)",
      },
    },
    required: ["path", "old_string", "new_string"],
  },
  requiresApproval: true,

  async execute(args) {
    const checked = resolveInsideCwd(args);
    if (!checked.ok) {
      return { ok: false, error: checked.error };
    }
    const { old_string: oldString, new_string: newString } = args;
    if (typeof oldString !== "string" || oldString === "") {
      return {
        ok: false,
        error: 'Missing or invalid "old_string" argument: expected a non-empty string.',
      };
    }
    if (typeof newString !== "string") {
      return {
        ok: false,
        error: 'Missing or invalid "new_string" argument: expected a string.',
      };
    }

    let text: string;
    try {
      text = await readFile(checked.absolute, "utf8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return {
          ok: false,
          error: `No such file: ${args.path}. To create a new file, use write_file.`,
        };
      }
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Could not read "${args.path}": ${detail}` };
    }

    const matches = countOccurrences(text, oldString);
    if (matches === 0) {
      return {
        ok: false,
        error: `old_string was not found in ${args.path}. It must match the file contents exactly, including whitespace.`,
      };
    }
    if (matches > 1) {
      return {
        ok: false,
        error: `old_string matches ${matches} places in ${args.path}. Include more surrounding context so it matches exactly once.`,
      };
    }

    try {
      await writeFile(checked.absolute, text.replace(oldString, newString), "utf8");
      return { ok: true, output: `Edited ${args.path}` };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Could not write "${args.path}": ${detail}` };
    }
  },
};
