import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";


const removedFiles = (await readdir("lib", { recursive: true, withFileTypes: true }))
  .filter((file) => file.name.endsWith(".d.ts") || file.name.endsWith(".d.ts.map"))
  .map((file) => rm(join(file.parentPath, file.name)));
await Promise.all(removedFiles);
