// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

interface ImportMeta {
  readonly hot?: {
    readonly data: Record<string, unknown>;
    accept(callback?: (module: unknown) => void): void;
  };
}
