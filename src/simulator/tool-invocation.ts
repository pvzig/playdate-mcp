export interface ToolInvocation {
  readonly arguments: readonly string[];
  readonly artifact?: {
    readonly mimeType: string;
    readonly path: string;
  };
}
