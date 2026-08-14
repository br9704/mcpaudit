import type { JsonRpcRequest, RpcResponse } from "../protocol/types.js";

export type TransportKind = "stdio" | "http";

export interface SendOptions {
  timeoutMs?: number;
  /**
   * HTTP only. Overrides the standard request headers so conformance probes can
   * deliberately send a mismatched `MCP-Protocol-Version` (expecting -32020) or
   * omit a required header.
   */
  headerOverrides?: Record<string, string | null>;
}

export interface Transport {
  readonly kind: TransportKind;
  /** Human-readable description of the target, for report headers. */
  readonly describe: string;
  send(req: JsonRpcRequest, opts?: SendOptions): Promise<RpcResponse>;
  /** Fire-and-forget; used for `notifications/cancelled` on stdio. */
  notify?(method: string, params?: Record<string, unknown>): void;
  close(): Promise<void>;
  /** Anything the server wrote to stderr (stdio only). Never treated as an
   * error signal — the spec says clients SHOULD NOT assume stderr means failure. */
  readonly stderr?: string;
}
