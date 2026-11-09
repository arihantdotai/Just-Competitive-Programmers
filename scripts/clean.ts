import { rm } from "node:fs/promises";
import path from "node:path";
import config from "../book.config";
import { parseArgs } from "./lib/util";

const args = parseArgs();
const onlyCache = args.flags.has("cache");
const onlyDist = args.flags.has("dist");
const dryRun = args.flags.has("dry-run");

const targets: string[] = [];

if (onlyCache) {
  targets.push(config.cacheDir);
} else if (onlyDist) {
  targets.push(config.distDir);
} else {
  targets.push(config.distDir, config.cacheDir);
}

for (const target of targets) {
  const resolved = path.resolve(target);
  if (dryRun) {
    console.log(`would remove ${path.relative(process.cwd(), resolved)}/`);
    continue;
  }

  await rm(resolved, { recursive: true, force: true });
  console.log(`removed ${path.relative(process.cwd(), resolved)}/`);
}
