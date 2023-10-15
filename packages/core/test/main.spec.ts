import * as path from "node:path";
import { getCodeExamples } from "../src";
import { readFileSync } from "node:fs";

describe("main", () => {
  it("run", async () => {
    const content = readFileSync(path.resolve("./fixture/testing.ts"), "utf8");
    const results = await getCodeExamples({
      sourceFileContents: content,
      transformExampleCode: async (input) => ({
        map: undefined,
        output: input,
      }),
    });
  });
});

describe("sourcemaps", () => {
  it("should offset the columns by the comment length", () => {
    const code = "console.log('hello')";
    const comment = ` * ${code}\n`;
    const result = "";

    expect(result.mappings);
  });
});
