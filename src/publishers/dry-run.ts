import type { Publisher } from "./base.js";
import type { ComposedPost, PublishResult } from "../types.js";

/** Always-safe publisher: prints the final funnel text and records an outbox row. */
export class DryRunPublisher implements Publisher {
  constructor(public outlet: Publisher["outlet"]) {}

  async publish(post: ComposedPost): Promise<PublishResult> {
    const result: PublishResult = {
      postId: post.id,
      outlet: this.outlet,
      dryRun: true,
      ok: true,
      externalId: `dry-${post.id}-${this.outlet}`,
      publishedAt: new Date().toISOString(),
      inviteLabel: post.inviteLabel,
      inviteUrl: post.inviteUrl,
    };

    console.log("\n──────── dry-run publish ────────");
    console.log(`post:    ${post.id} (${post.title})`);
    console.log(`outlet:  ${this.outlet}`);
    console.log(`invite:  ${post.inviteLabel} → ${post.inviteUrl}`);
    console.log(`cta:     ${post.ctaLine}`);
    console.log(`chars:   ${post.finalText.length}`);
    console.log("──────── final text ────────");
    console.log(post.finalText);
    console.log("────────────────────────────\n");

    return result;
  }
}
