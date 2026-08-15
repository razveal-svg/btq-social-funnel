/**
 * Shared types for the BTQ social → Discord funnel publisher.
 * See ../BTQ_DISCORD_HUB_FUNNEL.md for the product rules this encodes.
 */

export type Outlet = "x" | "telegram" | "linkedin";

/** Invite labels from the Discord hub funnel + awareness doors. */
export type InviteLabel =
  | "website-main"
  | "x-bio"
  | "youtube"
  | "cmc-gecko"
  | "event-ama"
  | "docs-help"
  | "docs-mining"
  | "explorer-main"
  | "pool-main"
  | "pool-support";

export type IntentRole = "miner" | "developer" | "researcher" | "curious";

export interface InviteDoor {
  label: InviteLabel;
  url: string;
  /** Where the member should go after ✅ verify */
  postVerifyDestination: string;
  /** Which outlets are allowed to use this door */
  allowedOutlets: Outlet[];
  notes?: string;
}

export interface PostAsset {
  path: string;
  alt?: string;
}

export interface CampaignPost {
  id: string;
  /** Human title for queue / logs */
  title: string;
  /** Body WITHOUT the Discord CTA — the compositor adds it */
  body: string;
  outlets: Outlet[];
  /** Required: which Discord door this post opens */
  inviteLabel: InviteLabel;
  intent?: IntentRole;
  /** Optional mid-funnel URL (docs, pool, explorer) before Discord */
  bridgeUrl?: string;
  assets?: PostAsset[];
  /** ISO schedule time; omit = publish when commanded */
  scheduledAt?: string;
  tags?: string[];
  /** Thread posts share a threadId; order by threadIndex */
  threadId?: string;
  threadIndex?: number;
}

export interface ComposedPost extends CampaignPost {
  finalText: string;
  inviteUrl: string;
  ctaLine: string;
}

export interface PublishResult {
  postId: string;
  outlet: Outlet;
  dryRun: boolean;
  ok: boolean;
  externalId?: string;
  url?: string;
  error?: string;
  publishedAt: string;
  inviteLabel: InviteLabel;
  inviteUrl: string;
}
