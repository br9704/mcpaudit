import type { Transport, SendOptions } from "../transport/types.js";
import { HttpTransport } from "../transport/http.js";
import {
  LATEST_PROTOCOL_VERSION,
  META_CLIENT_CAPABILITIES,
  META_CLIENT_INFO,
  META_PROTOCOL_VERSION,
  type JsonObject,
  type RpcResponse,
} from "./types.js";
import { DISPLAY_NAME } from "../brand.js";
import { VERSION } from "../version.js";

/**
 * CONTRACT: the internal MCP client (masterplan Sprint 1, `declare_contract`).
 *
 * Everything a probe or rule needs to talk to a server goes through here.
 * Requests never throw — a hostile or broken server is data, not an exception —
 * so every method returns an `RpcResponse` the caller inspects.
 */
export interface McpClientOptions {
  protocolVersion?: string;
  timeoutMs?: number;
}

export interface RequestOptions extends SendOptions {
  /**
   * Omit the required `_meta` keys entirely. Used by the C3 probe: a
   * 2026-07-28 server MUST reject such a request with -32602 / HTTP 400.
   */
  omitMeta?: boolean;
  /** Send `_meta` but drop these specific keys. */
  omitMetaKeys?: string[];
  /** Override the protocol version for this one request (header + body). */
  protocolVersionOverride?: string;
  /** Send no `params` at all. */
  omitParams?: boolean;
}

export class McpClient {
  #transport: Transport;
  #nextId = 1;
  #protocolVersion: string;
  #timeoutMs: number;

  constructor(transport: Transport, opts: McpClientOptions = {}) {
    this.#transport = transport;
    this.#protocolVersion = opts.protocolVersion ?? LATEST_PROTOCOL_VERSION;
    this.#timeoutMs = opts.timeoutMs ?? 10_000;
  }

  get transport(): Transport {
    return this.#transport;
  }

  get protocolVersion(): string {
    return this.#protocolVersion;
  }

  /** Switch versions after `server/discover` tells us what the server supports. */
  set protocolVersion(v: string) {
    this.#protocolVersion = v;
    if (this.#transport instanceof HttpTransport) this.#transport.protocolVersion = v;
  }

  /** The `_meta` block every 2026-07-28 request must carry. */
  buildMeta(overrideVersion?: string): JsonObject {
    return {
      [META_PROTOCOL_VERSION]: overrideVersion ?? this.#protocolVersion,
      // Required. An empty object means "no optional capabilities".
      [META_CLIENT_CAPABILITIES]: {},
      // SHOULD, and honest: an auditor should identify itself.
      [META_CLIENT_INFO]: { name: DISPLAY_NAME, version: VERSION },
    };
  }

  /** Send an arbitrary request with full control over the envelope. */
  async request(
    method: string,
    params: JsonObject = {},
    opts: RequestOptions = {},
  ): Promise<RpcResponse> {
    const id = this.#nextId++;

    let finalParams: JsonObject | undefined;
    if (opts.omitParams) {
      finalParams = undefined;
    } else if (opts.omitMeta) {
      finalParams = { ...params };
    } else {
      const meta = this.buildMeta(opts.protocolVersionOverride);
      for (const k of opts.omitMetaKeys ?? []) delete meta[k];
      finalParams = { ...params, _meta: meta };
    }

    const sendOpts: SendOptions = {
      timeoutMs: opts.timeoutMs ?? this.#timeoutMs,
      ...(opts.headerOverrides ? { headerOverrides: opts.headerOverrides } : {}),
    };

    return this.#transport.send(
      {
        jsonrpc: "2.0",
        id,
        method,
        ...(finalParams !== undefined ? { params: finalParams } : {}),
      },
      sendOpts,
    );
  }

  /** Mandatory in 2026-07-28; absent on every pre-2026 server. */
  discover(opts: RequestOptions = {}): Promise<RpcResponse> {
    return this.request("server/discover", {}, opts);
  }

  /** The pre-2026 handshake, used only by the legacy fallback lane. */
  initialize(protocolVersion: string, opts: RequestOptions = {}): Promise<RpcResponse> {
    return this.request(
      "initialize",
      {
        protocolVersion,
        capabilities: {},
        clientInfo: { name: DISPLAY_NAME, version: VERSION },
      },
      { ...opts, omitMeta: true },
    );
  }

  /** Legacy servers expect this notification after a successful `initialize`. */
  notifyInitialized(): void {
    this.#transport.notify?.("notifications/initialized");
  }

  listTools(opts: RequestOptions = {}): Promise<RpcResponse> {
    return this.request("tools/list", {}, opts);
  }

  callTool(
    name: string,
    args: JsonObject = {},
    opts: RequestOptions = {},
  ): Promise<RpcResponse> {
    return this.request("tools/call", { name, arguments: args }, opts);
  }

  close(): Promise<void> {
    return this.#transport.close();
  }
}
