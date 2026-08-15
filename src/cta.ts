import type { CampaignPost, ComposedPost, IntentRole, InviteLabel, Outlet } from "./types.js";
import type { InviteRegistry } from "./invites.js";

/** Opinionated CTA lines — match BTQ_DISCORD_HUB_FUNNEL copy bank tone. */
const CTA_BY_INTENT: Record<IntentRole, string> = {
  curious: "Builders and researchers hang out on Discord — verify to enter.",
  miner: "Miners: connect help and pool chat live on Discord.",
  developer: "Devs: ask in Discord #help / #dev-general — one thread per question.",
  researcher: "Discuss the threat model with researchers on Discord.",
};

const CTA_BY_LABEL: Partial<Record<InviteLabel, string>> = {
  "docs-help": "Still stuck? Open a thread in Discord #help.",
  "docs-mining": "Mining setup help lives in Discord — take the Miner role after verify.",
  "explorer-main": "Watching the chain? Talk about it in Discord #explorer-highlights.",
  "pool-main": "Point hash, then join miners on Discord.",
  "pool-support": "Shares not landing? Ask miners on Discord (staff never DM first).",
  "event-ama": "AMA live in Discord — join with this invite.",
  "x-bio": "Join BTQ Discord — verify, then pick Miner / Dev / Research.",
  "website-main": "Join the community on Discord.",
};

const PRODUCT_DOORS: InviteLabel[] = [
  "docs-help",
  "docs-mining",
  "explorer-main",
  "pool-main",
  "pool-support",
  "event-ama",
];

function ctaLine(post: CampaignPost): string {
  const byLabel = CTA_BY_LABEL[post.inviteLabel];
  if (PRODUCT_DOORS.includes(post.inviteLabel) && byLabel) return byLabel;
  if (post.intent) return CTA_BY_INTENT[post.intent];
  return byLabel ?? CTA_BY_INTENT.curious;
}

function stripExistingDiscordLinks(body: string): string {
  return body
    .replace(/https?:\/\/(?:www\.)?discord\.gg\/\S+/gi, "")
    .replace(/https?:\/\/(?:www\.)?discord\.com\/invite\/\S+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

/**
 * Every published post must open exactly one tracked Discord door.
 * Bridge URLs (docs/pool/explorer) may appear in the body; Discord is always last.
 */
export function composePost(
  post: CampaignPost,
  registry: InviteRegistry,
  outlet: Outlet,
  opts?: { allowPlaceholder?: boolean },
): ComposedPost {
  const door = registry.assertUsable(post.inviteLabel, outlet, opts);
  const line = ctaLine(post);
  const cleaned = stripExistingDiscordLinks(post.body.trim());

  const parts = [cleaned];
  if (post.bridgeUrl && !cleaned.includes(post.bridgeUrl)) {
    parts.push(post.bridgeUrl);
  }
  parts.push(`${line}\n${door.url}`);

  const finalText = parts.join("\n\n");

  return {
    ...post,
    finalText,
    inviteUrl: door.url,
    ctaLine: line,
  };
}

/** X hard limit with media is still 280 for standard accounts; we warn above softCap. */
export function assertLength(composed: ComposedPost, outlet: Outlet, softCap = 280): void {
  if (outlet !== "x") return;
  if (composed.finalText.length > softCap) {
    throw new Error(
      `Post "${composed.id}" is ${composed.finalText.length} chars after CTA (cap ${softCap}). Shorten body or CTA.`,
    );
  }
}
