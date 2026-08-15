import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import type { CampaignPost } from "./types.js";

const PostSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  outlets: z.array(z.enum(["x", "telegram", "linkedin"])).min(1),
  inviteLabel: z.enum([
    "website-main",
    "x-bio",
    "youtube",
    "cmc-gecko",
    "event-ama",
    "docs-help",
    "docs-mining",
    "explorer-main",
    "pool-main",
    "pool-support",
  ]),
  intent: z.enum(["miner", "developer", "researcher", "curious"]).optional(),
  bridgeUrl: z.string().url().optional(),
  assets: z
    .array(
      z.object({
        path: z.string(),
        alt: z.string().optional(),
      }),
    )
    .optional(),
  scheduledAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  threadId: z.string().optional(),
  threadIndex: z.number().int().nonnegative().optional(),
});

const CampaignFileSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  posts: z.array(PostSchema).min(1),
});

export type CampaignFile = z.infer<typeof CampaignFileSchema>;

export function loadCampaignFile(path: string): CampaignFile {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return CampaignFileSchema.parse(raw);
}

export function loadAllCampaigns(dir = process.env.BTQ_SOCIAL_CONTENT_DIR ?? "./content/campaigns"): CampaignFile[] {
  const abs = resolve(dir);
  const files = readdirSync(abs).filter((f) => f.endsWith(".json"));
  return files.map((f) => loadCampaignFile(join(abs, f)));
}

export function allPosts(campaigns: CampaignFile[]): CampaignPost[] {
  return campaigns.flatMap((c) => c.posts);
}

export function findPost(campaigns: CampaignFile[], postId: string): CampaignPost {
  const post = allPosts(campaigns).find((p) => p.id === postId);
  if (!post) throw new Error(`Post not found: ${postId}`);
  return post;
}
