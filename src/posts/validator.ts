import { assertLength, composePost } from "../cta.js";
import type { InviteRegistry } from "../invites.js";
import type { CampaignPost, ComposedPost } from "../types.js";

export interface ValidationIssue {
  postId: string;
  level: "error" | "warning";
  message: string;
}

/**
 * Hard rule from the hub funnel: no social publish without a tracked Discord door.
 */
export function validatePost(post: CampaignPost, registry: InviteRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!post.body.trim()) {
    issues.push({ postId: post.id, level: "error", message: "Empty body" });
  }

  if (/discord\.gg\/|discord\.com\/invite\//i.test(post.body)) {
    issues.push({
      postId: post.id,
      level: "warning",
      message: "Body already contains a Discord link; composer will strip and re-attach the tracked invite",
    });
  }

  if (/\b(seed phrase|private key|dm me|airdrop claim)\b/i.test(post.body)) {
    issues.push({
      postId: post.id,
      level: "error",
      message: "Body trips scam/safety keywords — rewrite before publish",
    });
  }

  for (const outlet of post.outlets) {
    try {
      const composed = composePost(post, registry, outlet);
      try {
        assertLength(composed, outlet);
      } catch (err) {
        issues.push({
          postId: post.id,
          level: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } catch (err) {
      issues.push({
        postId: post.id,
        level: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return issues;
}

export function composeForPublish(
  post: CampaignPost,
  registry: InviteRegistry,
): { composed: ComposedPost; issues: ValidationIssue[] }[] {
  return post.outlets.map((outlet) => {
    const issues = validatePost({ ...post, outlets: [outlet] }, registry);
    const composed = composePost(post, registry, outlet);
    return { composed: { ...composed, outlets: [outlet] }, issues };
  });
}
