import { resolve, sep } from "node:path";
import { config } from "../config/config";

export type PathCheck =
  | { ok: true; absolute: string }
  | { ok: false; error: string };

export function resolveInsideCwd(args: Record<string, unknown>): PathCheck {
  const raw = args.path;
  if (typeof raw !== "string" || raw.trim() === "") {
    return {
      ok: false,
      error: 'Missing or invalid "path" argument: expected a non-empty string.',
    };
  }

  const absolute = resolve(config.cwd, raw);
  if (absolute !== config.cwd && !absolute.startsWith(config.cwd + sep)) {
    return {
      ok: false,
      error: `Refused: "${raw}" resolves outside the project directory.`,
    };
  }

  return { ok: true, absolute };
}
