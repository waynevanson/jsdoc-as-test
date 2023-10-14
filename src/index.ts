import * as tsdoc from "@microsoft/tsdoc";
import type { EncodedSourceMap } from "@jridgewell/trace-mapping";

// `babel` and `@jridgewell/trace-mapping` disagrees - `number` vs `3`
export interface FixedRawSourceMap extends Omit<EncodedSourceMap, "version"> {
  version: number;
}

export type SourceMapLike = FixedRawSourceMap | string;

export interface OutputExample {
  title: string | undefined;
  extension: string | undefined;
  code: string;
  map: SourceMapLike | undefined;
}

export interface Output {
  examples: Array<OutputExample>;
}

export type Transformer = (input: string) => Promise<{
  output: string;
  map: SourceMapLike | undefined;
}>;

export interface Input {
  sourceFileName: string;
  sourceFileContents: string;
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

// how to get the source map for this? I think I need to use something like the tscompiler
// to get that information.
const getComments = (content: string) =>
  Array.from(content.matchAll(/\/\*\*.*?\*\//gms)).flatMap((a) =>
    Array.from(a.values())
  );

async function getResultFromBlock(
  block: tsdoc.DocBlock,
  sourceFileName: string,
  transformer: Transformer | undefined
): Promise<OutputExample> {
  const nodes = block.content.nodes;
  const title = getTitleFromNodes(nodes);
  const { extension, code: precompiled } = getCodeFromNodes(nodes);

  //@ts-expect-error - handle undefined with warnings or errors
  const { output, map } = (await transformer?.(precompiled)) ?? {
    output: precompiled,
    map: undefined,
  };

  //@ts-expect-error - handle undefined with warnings or errors
  return { title, extension, map, code: output };
}

export async function main({
  sourceFileName,
  sourceFileContents,
  transformExampleCode,
}: Input): Promise<Output> {
  const parser = new tsdoc.TSDocParser();
  const comments = getComments(sourceFileContents);
  const contexts = comments.flatMap((comment) => parser.parseString(comment));

  const exampleBlocks = contexts
    .flatMap((context) => context.docComment.customBlocks)
    .filter((block) => block.blockTag.tagName === "@example");

  const examples = await Promise.all(
    exampleBlocks.map((block) =>
      getResultFromBlock(block, sourceFileName, transformExampleCode)
    )
  );

  return { examples };
}
