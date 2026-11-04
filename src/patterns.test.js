import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { generate } from "../scripts/generate-patterns.js";

test("patterns.js is what scripts/generate-patterns.js generates; run `npm run generate`", async () => {
  expect(await readFile(new URL("./patterns.js", import.meta.url), "utf8")).to.equal(generate());
});
