import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  DEFAULT_API_REQUEST_ERROR,
  DEFAULT_NETWORK_CONNECTIVITY_ERROR,
} from "../constants/api";
import {
  apiClient,
  ApiError,
  buildPathVariants,
  fetchSplitById,
  getApiErrorMessage,
  getApiFieldErrors,
  normalizeApiError,
} from "./api-client";

describe("buildPathVariants (route resolution)", () => {
  it("on unversioned /api, prepends /v1 before bare controller path, then unversioned", () => {
    const paths = buildPathVariants("/splits/abc", false, "/api");
    expect(paths).toEqual(["/v1/splits/abc", "/splits/abc"]);
  });

  it("on versioned /api/v1, does not inject an extra /v1 prefix", () => {
    const paths = buildPathVariants("/splits/abc", false, "/api/v1");
    expect(paths).toEqual(["/splits/abc"]);
  });

  it("on unversioned base, includeControllerApiPrefix interleaves /api before bare paths", () => {
    const paths = buildPathVariants("/receipts/1", true, "/api");
    expect(paths).toEqual([
      "/v1/api/receipts/1",
      "/v1/receipts/1",
      "/api/receipts/1",
      "/receipts/1",
    ]);
  });

  it("on versioned base, includeControllerApiPrefix only toggles /api, not an extra /v1", () => {
    const paths = buildPathVariants("/receipts/1", true, "/api/v1");
    expect(paths).toEqual(["/api/receipts/1", "/receipts/1"]);
  });

  it("normalizes endpoint without a leading slash", () => {
    const paths = buildPathVariants("splits/x", false, "/api");
    expect(paths).toEqual(["/v1/splits/x", "/splits/x"]);
  });
});

function axiosError(
  config: { status: number; data?: unknown; code?: string; message?: string; response?: boolean },
): AxiosError<unknown> {
  const err = new AxiosError(
    config.message ?? "err",
    config.code,
    { url: "/t" } as unknown as InternalAxiosRequestConfig,
  );
  if (config.response !== false) {
    err.response = {
      status: config.status,
      data: config.data ?? {},
      statusText: "",
      config: { url: "/t" } as unknown as InternalAxiosRequestConfig,
      headers: {},
    };
  }
  return err;
}

describe("normalizeApiError and helpers", () => {
  it("keeps ApiError as-is (identity)", () => {
    const e = new ApiError({
      message: "custom",
      statusCode: 400,
      fieldErrors: { title: "x" },
      isNetworkError: false,
    });
    expect(normalizeApiError(e)).toBe(e);
  });

  it("wraps a non-axios error with the default request message", () => {
    const n = normalizeApiError(new TypeError("oops"));
    expect(n).toBeInstanceOf(ApiError);
    expect(n.message).toBe(DEFAULT_API_REQUEST_ERROR);
    expect(n.isNetworkError).toBe(false);
    expect(n.fieldErrors).toEqual({});
  });

  it("uses the first string message and maps field keys from text", () => {
    const err = axiosError({
      status: 400,
      data: {
        message: "currency must be a valid code",
        error: "ignored when message exists",
      },
    });
    const n = normalizeApiError(err);
    expect(n.message).toContain("currency");
    expect(n.fieldErrors.currency).toBe("currency must be a valid code");
  });

  it("extracts nested and array messages for field heuristics", () => {
    const err = axiosError({
      status: 400,
      data: {
        message: [
          { msg: "participant 1 is missing" },
          { msg: "total amount is wrong" },
        ],
      },
    });
    const n = normalizeApiError(err);
    expect(n.fieldErrors.participants).toMatch(/participant/);
    expect(n.fieldErrors.totalAmount).toMatch(/total/);
  });

  it("marks missing response as a network error; uses default when there is no extractable message", () => {
    const e = new AxiosError("");
    e.config = { url: "/a" } as never;
    e.response = undefined;
    const n = normalizeApiError(e);
    expect(n.isNetworkError).toBe(true);
    expect(n.message).toBe(DEFAULT_NETWORK_CONNECTIVITY_ERROR);
  });

  it("prefers axiosError.message for no-response when non-empty, but still sets isNetworkError", () => {
    const e = new AxiosError("fail", "ERR", { url: "/a" } as never);
    e.response = undefined;
    const n = normalizeApiError(e);
    expect(n.isNetworkError).toBe(true);
    expect(n.message).toBe("fail");
  });

  it("uses the network default for ECONNABORTED when no user-facing message is extracted", () => {
    const e = new AxiosError("");
    e.config = { url: "/a" } as never;
    e.code = "ECONNABORTED";
    e.response = undefined;
    const n = normalizeApiError(e);
    expect(n.isNetworkError).toBe(true);
    expect(n.message).toBe(DEFAULT_NETWORK_CONNECTIVITY_ERROR);
  });

  it("exposes the same data via getApiErrorMessage and getApiFieldErrors", () => {
    const err = axiosError({
      status: 400,
      data: { message: "wallet is invalid" },
    });
    expect(getApiErrorMessage(err)).toBe(
      (normalizeApiError(err) as ApiError).message,
    );
    expect(getApiFieldErrors(err).walletAddress).toBe("wallet is invalid");
  });
});

describe("requestWithFallback (mocked transport)", () => {
  // Vitest's spyOn key constraint does not list axios' `request`; runtime is correct.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requestSpy: any;

  const minimalSplit = {
    id: "1",
    totalAmount: 0,
    amountPaid: 0,
    status: "active" as const,
    createdAt: "",
    updatedAt: "",
    participants: [] as { id: string; userId: string; amountOwed: number; amountPaid: number; status: "pending" }[],
  };

  beforeEach(() => {
    requestSpy = vi.spyOn(apiClient, "request");
  });

  afterEach(() => {
    requestSpy?.mockRestore();
  });

  it("retries the next path variant on 404 and returns when a later call succeeds", async () => {
    const variants = buildPathVariants("/splits/fallback-id", false);
    const first = variants[0]!;
    const last = variants[variants.length - 1]!;

    requestSpy.mockImplementation(
      async (conf: InternalAxiosRequestConfig) => {
        if (String(conf.url) === first) {
          throw axiosError({ status: 404, data: { message: "nope" } });
        }
        return { data: minimalSplit };
      },
    );

    const data = await fetchSplitById("fallback-id");
    expect(data).toEqual(minimalSplit);
    expect(requestSpy).toHaveBeenCalled();
    const urls = requestSpy.mock.calls.map(
      (c: [{ url?: string }]) => c[0].url,
    ) as (string | undefined)[];
    expect(urls[0]).toBe(first);
    expect(urls.at(-1)).toBe(last);
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it("stops and throws on a non-404 (does not exhaust variants for retry)", async () => {
    const variants = buildPathVariants("/splits/err-id", false);
    requestSpy.mockImplementation(
      async (conf: InternalAxiosRequestConfig) => {
        if (String(conf.url) === variants[0]!) {
          throw axiosError({ status: 500, data: { message: "server" } });
        }
        return { data: minimalSplit };
      },
    );
    await expect(fetchSplitById("err-id")).rejects.toMatchObject({
      message: "server",
      statusCode: 500,
    });
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it("throws a normalized error after 404 on every variant", async () => {
    const variants = buildPathVariants("/splits/404-only", false);
    requestSpy.mockImplementation(async () => {
      throw axiosError({ status: 404, data: { message: "missing" } });
    });
    await expect(fetchSplitById("404-only")).rejects.toBeInstanceOf(ApiError);
    expect(requestSpy).toHaveBeenCalledTimes(variants.length);
  });
});

describe("axios.isAxiosError is honored", () => {
  it("is true for our axios error factory", () => {
    const e = axiosError({ status: 400, data: {} });
    expect(axios.isAxiosError(e)).toBe(true);
  });
});
