import type { Test, AssertionResult } from "@jest/test-result";
import { createScriptTransformer } from "@jest/transform";
import { getCodeExamples } from "@waynevanson/doc-test-inline-core";
import type {
  CallbackTestRunnerInterface,
  OnTestFailure,
  OnTestStart,
  OnTestSuccess,
  TestRunnerOptions,
  TestWatcher,
} from "jest-runner";
import { timeEnd } from "node:console";
import { readFile } from "node:fs/promises";

export default class DocTestInlineRunner
  implements CallbackTestRunnerInterface
{
  isSerial?: boolean | undefined = true;

  async runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
    options: TestRunnerOptions
  ): Promise<void> {
    const transformOptions = {
      instrument: false,
      supportsDynamicImport: false,
      supportsExportNamespaceFrom: false,
      supportsStaticESM: false,
      supportsTopLevelAwait: false,
    };
    for await (const test of tests) {
      await onStart(test);
      const startTime = Date.now();
      try {
        const transformer = await createScriptTransformer(test.context.config);

        // i have feeling that file name is a cache key
        const sourceFileContent = await readFile(test.path, "utf8");

        const { sourceMapPath: sourceFileSourceMapPath } =
          await transformer.transformSourceAsync(
            test.path,
            sourceFileContent,
            transformOptions
          );

        console.log({ sourceFileSourceMapPath });

        const sourceFileSourceMapContent = sourceFileSourceMapPath
          ? await readFile(sourceFileSourceMapPath, "utf8")
          : undefined;

        const sourceFileSourceMap =
          sourceFileSourceMapContent != null
            ? (JSON.parse(sourceFileSourceMapContent) as never)
            : undefined;

        const { examples } = await getCodeExamples({
          sourceFileContents: sourceFileContent,
          sourceFileSourceMap,
          transformExampleCode: async (source) => {
            const { code, sourceMapPath } =
              await transformer.transformSourceAsync(
                test.path,
                source,
                transformOptions
              );

            const sourceMapContent =
              sourceMapPath != null
                ? await readFile(sourceMapPath, "utf8")
                : undefined;

            const map =
              sourceMapContent != null
                ? (JSON.parse(sourceMapContent) as never)
                : undefined;

            return { output: code, map };
          },
        });

        const testResults = examples.map(
          ({ title, code, extension, map }, index): AssertionResult => {
            title = title ?? "";
            const fullName = title;
            try {
              eval(code);

              return {
                title,
                ancestorTitles: [],
                failureDetails: [],
                failureMessages: [],
                fullName,
                numPassingAsserts: 0,
                status: "passed",
              };
            } catch (error) {
              return {
                title,
                ancestorTitles: [],
                failureDetails: [error],
                failureMessages: [],
                fullName,
                numPassingAsserts: 0,
                status: "failed",
              };
            }
          }
        );

        const endTime = Date.now();

        await onResult(test, {
          skipped: examples.length <= 0,
          leaks: false,
          numTodoTests: 0,
          numFailingTests: 0,
          numPassingTests: examples.length,
          numPendingTests: 0,
          openHandles: [],
          perfStats: {
            start: startTime,
            end: endTime,
            runtime: endTime - startTime,
            slow: false,
          },
          snapshot: {
            added: 0,
            fileDeleted: false,
            matched: 0,
            unchecked: 0,
            uncheckedKeys: [],
            unmatched: 0,
            updated: 0,
          },
          testFilePath: test.path,
          testResults,
        });
      } catch (error) {
        await onFailure(test, {
          //@ts-expect-error
          message: error?.message ?? String(error),
          //@ts-expect-error
          stack: error.stack ?? null,
        });
      }
    }
  }
}
