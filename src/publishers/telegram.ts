import type { Publisher } from "./base.js";
import type { ComposedPost, PublishResult } from "../types.js";

/**
 * Telegram is broadcast-only in the hub funnel — never primary support.
 * Posts still must carry a Discord invite so readers are pulled into the hub.
 */
export class TelegramPublisher implements Publisher {
  outlet = "telegram" as const;

  async publish(post: ComposedPost): Promise<PublishResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return {
        postId: post.id,
        outlet: "telegram",
        dryRun: false,
        ok: false,
        error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
        publishedAt: new Date().toISOString(),
        inviteLabel: post.inviteLabel,
        inviteUrl: post.inviteUrl,
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: post.finalText,
        disable_web_page_preview: false,
      }),
    });

    const json = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!json.ok) {
      return {
        postId: post.id,
        outlet: "telegram",
        dryRun: false,
        ok: false,
        error: json.description ?? `HTTP ${res.status}`,
        publishedAt: new Date().toISOString(),
        inviteLabel: post.inviteLabel,
        inviteUrl: post.inviteUrl,
      };
    }

    return {
      postId: post.id,
      outlet: "telegram",
      dryRun: false,
      ok: true,
      externalId: String(json.result?.message_id ?? ""),
      publishedAt: new Date().toISOString(),
      inviteLabel: post.inviteLabel,
      inviteUrl: post.inviteUrl,
    };
  }
}
