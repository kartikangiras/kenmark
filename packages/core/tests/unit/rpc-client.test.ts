import { describe, expect, it } from "vitest";
import { isRateLimitError, withRateLimitBackoff } from "../../src/rpc/client.js";
import { RpcUnreachableError } from "@kenmark/errors";

describe("isRateLimitError", () => {
  it("matches a 429 anywhere in the cause chain", () => {
    const inner = new Error("HTTP 429 Too Many Requests");
    expect(isRateLimitError(inner)).toBe(true);
    expect(isRateLimitError(new RpcUnreachableError("https://rpc.example", inner))).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isRateLimitError(new Error("Transaction simulation failed"))).toBe(false);
    expect(isRateLimitError(new RpcUnreachableError("https://rpc.example", new Error("ECONNRESET")))).toBe(false);
  });
});

describe("withRateLimitBackoff", () => {
  it("retries only rate limits and returns the first success", async () => {
    let calls = 0;
    const value = await withRateLimitBackoff(async () => {
      calls++;
      if (calls < 3) throw new Error("429");
      return "ok";
    }, [1, 1, 1]);
    expect(value).toBe("ok");
    expect(calls).toBe(3);
  });

  it("rethrows a non-rate-limit error immediately", async () => {
    let calls = 0;
    await expect(
      withRateLimitBackoff(async () => {
        calls++;
        throw new Error("boom");
      }, [1, 1]),
    ).rejects.toThrow("boom");
    expect(calls).toBe(1);
  });

  it("gives up after the delays are exhausted", async () => {
    let calls = 0;
    await expect(
      withRateLimitBackoff(async () => {
        calls++;
        throw new Error("too many requests");
      }, [1, 1]),
    ).rejects.toThrow("too many requests");
    expect(calls).toBe(3);
  });
});
