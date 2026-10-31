// webpack's require.context, used by src/reels.ts to find every reels/<folder>/edit.tsx.
// Merged into @types/node's `require` so the two don't clash.
interface WebpackContext {
  keys(): string[];
  (id: string): { default: unknown };
}
declare namespace NodeJS {
  interface Require {
    context(directory: string, useSubdirectories: boolean, regExp: RegExp): WebpackContext;
  }
}
