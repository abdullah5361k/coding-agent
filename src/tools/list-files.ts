import { readdir } from "node:fs/promises";
import { resolveInsideCwd } from "./safe-path";
import type { Tool } from "./tool";

const MAX_ENTRIES = 50;

export const listFilesTool: Tool = {
  name: "list_files",
  description:
    "List the entries of a directory. Directories are marked with a trailing \"/\". Use this to explore the project structure before reading files. The path must be relative to the project root; use \".\" for the root itself. Returns at most 50 entries.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: 'Directory path relative to the project root, e.g. "." or "src"',
      },
    },
    required: ["path"],
  },

  async execute(args) {
    const checked = resolveInsideCwd(args);
    if (!checked.ok) {
      return { ok: false, error: checked.error };
    }

    let entries;
    try {
      entries = await readdir(checked.absolute, { withFileTypes: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return { ok: false, error: `No such directory: ${args.path}` };
      }
      if (code === "ENOTDIR") {
        return {
          ok: false,
          error: `"${args.path}" is a file, not a directory. Use read_file to see its contents.`,
        };
      }
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Could not list "${args.path}": ${detail}` };
    }

    if (entries.length === 0) {
      return { ok: true, output: "(empty directory)" };
    }

    const names = entries
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort((a, b) => a.localeCompare(b));

    const shown = names.slice(0, MAX_ENTRIES);
    if (names.length > MAX_ENTRIES) {
      shown.push(`... and ${names.length - MAX_ENTRIES} more entries not shown`);
    }

    return { ok: true, output: shown.join("\n") };
  },
};
