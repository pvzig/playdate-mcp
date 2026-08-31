export interface RuntimeConfiguration {
  readonly executable: string;
  readonly execution: ExecutionConfiguration;
  readonly invocation: InvocationConfiguration;
}

export interface ExecutionConfiguration {
  readonly timeoutMilliseconds: number;
  readonly workingDirectory: string;
}

export interface InvocationConfiguration {
  readonly agentPath?: string;
  readonly simulatorAppPath?: string;
}
