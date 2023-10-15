import * as tsdoc from "@microsoft/tsdoc";
import type { EncodedSourceMap } from "@jridgewell/trace-mapping";
import {} from "@jridgewell/trace-mapping";

import {} from "source-map";

// `babel` and `@jridgewell/trace-mapping` disagrees - `number` vs `3`
export interface FixedRawSourceMap extends Omit<EncodedSourceMap, "version"> {
  version: number;
}

export interface OutputExample {
  title: string | undefined;
  extension: string | undefined;
  code: string;
  map: FixedRawSourceMap | undefined;
}

export interface Output {
  examples: Array<OutputExample>;
}

export type Transformer = (input: string) => Promise<{
  output: string;
  map: FixedRawSourceMap | undefined;
}>;

export interface Input {
  sourceFileContents: string;
  sourceFileSourceMap?: FixedRawSourceMap;
  transformExampleCode?: Transformer;
}

function getTitleFromNodes(nodes: ReadonlyArray<tsdoc.DocNode>) {
  const paragraph = nodes.find(
    (node): node is tsdoc.DocParagraph => node instanceof tsdoc.DocParagraph
  );
  const plainText = paragraph
    ?.getChildNodes()
    .find(
      (value): value is tsdoc.DocPlainText =>
        value instanceof tsdoc.DocPlainText
    );
  return plainText?.text.trim();
}

function getCodeFromNodes(nodes: ReadonlyArray<tsdoc.DocNode>) {
  const fencedCodeNode = nodes.find(
    (node): node is tsdoc.DocFencedCode => node instanceof tsdoc.DocFencedCode
  );

  const extension = fencedCodeNode?.language
    ? "." + fencedCodeNode.language
    : undefined;

  const excerpt = fencedCodeNode
    ?.getChildNodes()
    .find(
      (node): node is tsdoc.DocExcerpt =>
        node instanceof tsdoc.DocExcerpt &&
        node.excerptKind === tsdoc.ExcerptKind.FencedCode_Code
    );

  const code = excerpt?.content.toString();

  return { extension, code };
}

const REGEXP_JSDOC = /\/\*\*.*?\*\//gs;
const REGEXP_CODE_BLOCK = /(?<=```\w*\n).*?\n(?=\s*\*\s*```)/dgs;
const REGEXP_COMMENT_START = /^\s*\*\s?/dg;

// regex not working not sure why...
function getOffsetsFromCode(jsdoc: string) {
  const codeBlocks = Array.from(jsdoc.matchAll(REGEXP_CODE_BLOCK));
  const comm = codeBlocks.map((codeBlock) =>
    codeBlock[0]
      .split(/\n/)
      .flatMap((line) => Array.from(line.matchAll(REGEXP_COMMENT_START)))
      .map((match) => ({
        end: match?.indices?.[0][1],
      }))
  );

  return comm;
}

const getComments = (content: string) => {
  const matches = Array.from(content.matchAll(REGEXP_JSDOC));
  const res = matches.map((match) => ({
    value: match[0],
    start: match.index,
  }));

  return res;
};

// source maps are going to be the hardest part of this package.
async function getResultFromBlock({
  block,
  sourceFileSourceMap,
  transformer,
}: {
  block: tsdoc.DocBlock;
  sourceFileSourceMap: FixedRawSourceMap | undefined;
  transformer: Transformer | undefined;
}): Promise<OutputExample | null> {
  const nodes = block.content.nodes;
  const title = getTitleFromNodes(nodes);
  const { extension, code: precompiled } = getCodeFromNodes(nodes);

  if (precompiled == null) return null;

  const { output = precompiled, map = undefined } =
    (await transformer?.(precompiled)) ?? {};

  if (map != null && sourceFileSourceMap != null) {
    // turn `map` into a source map we can understand
    // translate the line (3) and column (4) in the sourcemap with the comments.
  }

  return {
    title,
    extension,
    map,
    code: output,
  };
}

export async function getCodeExamples({
  sourceFileContents,
  sourceFileSourceMap,
  transformExampleCode,
}: Input): Promise<Output> {
  const parser = new tsdoc.TSDocParser();
  const comments = getComments(sourceFileContents);
  const contexts = comments.flatMap((comment) =>
    parser.parseString(comment.value)
  );
  const ranges = comments.map((code) => getOffsetsFromCode(code.value));

  const exampleBlocks = contexts
    .flatMap((context) => context.docComment.customBlocks)
    .filter((block) => block.blockTag.tagName === "@example");

  const examples = (
    await Promise.all(
      exampleBlocks.map((block) =>
        getResultFromBlock(block, sourceFileSourceMap, transformExampleCode)
      )
    )
  ).filter((value): value is NonNullable<typeof value> => value != null);

  return { examples };
}

// find the valid example block
// if there is no space between the `*` and the code, -1 gap.
//
