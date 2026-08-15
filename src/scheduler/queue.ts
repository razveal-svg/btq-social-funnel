import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CampaignPost } from "../types.js";

export interface QueueItem {
  postId: string;
  scheduledAt: string;
  status: "pending" | "published" | "failed" | "skipped";
  campaignId?: string;
}

interface QueueFile {
  items: QueueItem[];
}

function queuePath(): string {
  return resolve(process.env.BTQ_SOCIAL_QUEUE_PATH ?? "./data/queue.json");
}

function load(): QueueFile {
  const path = queuePath();
  if (!existsSync(path)) return { items: [] };
  return JSON.parse(readFileSync(path, "utf8")) as QueueFile;
}

function save(file: QueueFile): void {
  const path = queuePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(file, null, 2), "utf8");
}

/** Enqueue posts that have scheduledAt; idempotent by postId. */
export function enqueuePosts(posts: CampaignPost[], campaignId?: string): QueueItem[] {
  const file = load();
  const added: QueueItem[] = [];
  for (const post of posts) {
    if (!post.scheduledAt) continue;
    if (file.items.some((i) => i.postId === post.id)) continue;
    const item: QueueItem = {
      postId: post.id,
      scheduledAt: post.scheduledAt,
      status: "pending",
      campaignId,
    };
    file.items.push(item);
    added.push(item);
  }
  file.items.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  save(file);
  return added;
}

export function listQueue(): QueueItem[] {
  return load().items;
}

export function duePosts(now = new Date()): QueueItem[] {
  const iso = now.toISOString();
  return load().items.filter((i) => i.status === "pending" && i.scheduledAt <= iso);
}

export function markQueue(postId: string, status: QueueItem["status"]): void {
  const file = load();
  const item = file.items.find((i) => i.postId === postId);
  if (!item) return;
  item.status = status;
  save(file);
}

export function appendScheduleLog(line: string): void {
  const path = resolve("./data/scheduler.log");
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${new Date().toISOString()} ${line}\n`, "utf8");
}
