import { createHmac, randomBytes } from "node:crypto";
import type { Publisher } from "./base.js";
import type { ComposedPost, PublishResult } from "../types.js";

/**
 * Minimal X (Twitter) API v2 tweet create via OAuth 1.0a user context.
 * Media upload is intentionally out of scope for v0 — attach images manually
 * or extend with upload.twitter.com later.
 *
 * Required env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */
export class XPublisher implements Publisher {
  outlet = "x" as const;

  private missingCreds(): string[] {
    const keys = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"] as const;
    return keys.filter((k) => !process.env[k]);
  }

  async publish(post: ComposedPost): Promise<PublishResult> {
    const missing = this.missingCreds();
    if (missing.length) {
      return {
        postId: post.id,
        outlet: "x",
        dryRun: false,
        ok: false,
        error: `Missing X credentials: ${missing.join(", ")}. Use --dry-run or fill .env`,
        publishedAt: new Date().toISOString(),
        inviteLabel: post.inviteLabel,
        inviteUrl: post.inviteUrl,
      };
    }

    const url = "https://api.twitter.com/2/tweets";
    const body = JSON.stringify({ text: post.finalText });
    const auth = this.oauthHeader("POST", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body,
    });

    const json = (await res.json()) as { data?: { id: string }; detail?: string; title?: string };
    if (!res.ok) {
      return {
        postId: post.id,
        outlet: "x",
        dryRun: false,
        ok: false,
        error: json.detail ?? json.title ?? `HTTP ${res.status}`,
        publishedAt: new Date().toISOString(),
        inviteLabel: post.inviteLabel,
        inviteUrl: post.inviteUrl,
      };
    }

    const id = json.data?.id;
    return {
      postId: post.id,
      outlet: "x",
      dryRun: false,
      ok: true,
      externalId: id,
      url: id ? `https://x.com/i/web/status/${id}` : undefined,
      publishedAt: new Date().toISOString(),
      inviteLabel: post.inviteLabel,
      inviteUrl: post.inviteUrl,
    };
  }

  private oauthHeader(method: string, url: string): string {
    const oauth: Record<string, string> = {
      oauth_consumer_key: process.env.X_API_KEY!,
      oauth_nonce: randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: process.env.X_ACCESS_TOKEN!,
      oauth_version: "1.0",
    };

    const paramString = Object.keys(oauth)
      .sort()
      .map((k) => `${enc(k)}=${enc(oauth[k])}`)
      .join("&");

    const base = [method.toUpperCase(), enc(url), enc(paramString)].join("&");
    const signingKey = `${enc(process.env.X_API_SECRET!)}&${enc(process.env.X_ACCESS_TOKEN_SECRET!)}`;
    oauth.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64");

    const header = Object.keys(oauth)
      .sort()
      .map((k) => `${enc(k)}="${enc(oauth[k])}"`)
      .join(", ");

    return `OAuth ${header}`;
  }
}

function enc(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
