import { exec } from "node:child_process";
import { config } from "../config/config";
import type { Tool, ToolResult } from "./tool";

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 8_000;

function cap(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) {
    return text;
  }
  const hidden = text.length - MAX_OUTPUT_CHARS;
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n... [output truncated, ${hidden} more characters]`;
}

function describeOutput(stdout: string, stderr: string): string {
  const parts: string[] = [];
  if (stdout.trim() !== "") parts.push(`stdout:\n${stdout}`);
  if (stderr.trim() !== "") parts.push(`stderr:\n${stderr}`);
  return parts.length > 0 ? cap(parts.join("\n")) : "(no output)";
}

export const runShellTool: Tool = {
  name: "run_shell",
  description:
    "Run a shell command in the project root and get back its stdout, stderr, and exit status. Use this to run tests, type checks, git commands, or npm scripts. Commands are killed after 30 seconds, so do not start dev servers, watch modes, or anything interactive.",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: 'The shell command to run, e.g. "npx tsc --noEmit" or "git status"',
      },
    },
    required: ["command"],
  },
  requiresApproval: true,

  async execute(args) {
    const command = args.command;
    if (typeof command !== "string" || command.trim() === "") {
      return {
        ok: false,
        error: 'Missing or invalid "command" argument: expected a non-empty string.',
      };
    }

    return new Promise<ToolResult>((resolve) => {
      exec(
        command,
        { cwd: config.cwd, timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          const output = describeOutput(stdout, stderr);

          if (!error) {
            resolve({ ok: true, output });
          } else if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
            resolve({
              ok: false,
              error:
                "Command produced too much output and was killed. Re-run it with the output filtered or paginated (e.g. pipe through head or grep).",
            });
          } else if (error.killed) {
            resolve({
              ok: false,
              error: `Command was killed after exceeding the ${TIMEOUT_MS / 1000}s timeout. It may be long-running or waiting for input. Output before the kill:\n${output}`,
            });
          } else if (typeof error.code === "number") {
            resolve({
              ok: false,
              error: `Command failed with exit code ${error.code}.\n${output}`,
            });
          } else {
            resolve({
              ok: false,
              error: `Command could not be started: ${error.message}`,
            });
          }
        },
      );
    });
  },
};
