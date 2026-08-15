import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ComposedPost, Outlet, PublishResult } from "../types.js";

export interface Publisher {
  outlet: Outlet;
  publish(post: ComposedPost): Promise<PublishResult>;
}

export function appendOutbox(result: PublishResult, path = process.env.BTQ_SOCIAL_OUTBOX_PATH ?? "./data/outbox.jsonl"): void {
  const abs = resolve(path);
  mkdirSync(dirname(abs), { recursive: true });
  appendFileSync(abs, `${JSON.stringify(result)}\n`, "utf8");
}
