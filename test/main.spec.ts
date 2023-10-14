import * as path from "node:path";
import { main } from "../src";
import { readFileSync } from "node:fs";

describe("main", () => {
  it("run", async () => {
    const content = readFileSync(path.resolve("./fixture/testing.ts"), "utf8");
    const results = await main({
      sourceFileContents: content,
      sourceFileName: "/sup/pro.ts",
      transformExampleCode: async (input) => ({
        map: undefined,
        output: input,
      }),
    });
    console.log(results);
  });
});
