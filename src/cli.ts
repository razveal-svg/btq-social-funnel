#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { composePost, assertLength } from "./cta.js";
import { InviteRegistry } from "./invites.js";
import { allPosts, findPost, loadAllCampaigns } from "./posts/loader.js";
import { validatePost } from "./posts/validator.js";
import { appendOutbox } from "./publishers/base.js";
import { getPublisher } from "./publishers/index.js";
import { duePosts, enqueuePosts, listQueue, markQueue, appendScheduleLog } from "./scheduler/queue.js";

const program = new Command();
program
  .name("btq-social")
  .description("Publish BTQ social posts that always funnel into tracked Discord invites")
  .version("0.1.0");

program
  .command("invites")
  .description("List Discord invite doors from data/invite-links.json")
  .action(() => {
    const registry = InviteRegistry.load();
    for (const door of registry.list()) {
      const ready = door.url.startsWith("https://discord.gg/") ? "ready" : "NEEDS_URL";
      console.log(`${door.label.padEnd(16)} [${ready}] ${door.url}`);
      console.log(`  → ${door.postVerifyDestination}`);
    }
  });

program
  .command("validate")
  .description("Validate all campaign posts (invite + CTA + length)")
  .action(() => {
    const registry = InviteRegistry.load();
    const campaigns = loadAllCampaigns();
    let errors = 0;
    for (const post of allPosts(campaigns)) {
      const issues = validatePost(post, registry);
      for (const issue of issues) {
        console.log(`${issue.level.toUpperCase()} ${issue.postId}: ${issue.message}`);
        if (issue.level === "error") errors += 1;
      }
      if (!issues.length) console.log(`OK ${post.id}`);
    }
    if (errors) {
      console.error(`\n${errors} error(s)`);
      process.exit(1);
    }
  });

program
  .command("preview")
  .description("Compose final funnel text for a post (does not publish)")
  .argument("<postId>")
  .option("--allow-placeholder", "Compose even if invite URL is still REPLACE_WITH_DISCORD_INVITE", false)
  .action((postId: string, opts: { allowPlaceholder: boolean }) => {
    const registry = InviteRegistry.load();
    const post = findPost(loadAllCampaigns(), postId);
    for (const outlet of post.outlets) {
      const composed = composePost(post, registry, outlet, { allowPlaceholder: opts.allowPlaceholder });
      if (!opts.allowPlaceholder) assertLength(composed, outlet);
      console.log(`\n# ${post.id} → ${outlet}`);
      console.log(composed.finalText);
      console.log(`\n(${composed.finalText.length} chars | ${composed.inviteLabel})`);
    }
  });

program
  .command("publish")
  .description("Publish one post to its outlets")
  .argument("<postId>")
  .option("--dry-run", "Force dry-run even if BTQ_SOCIAL_DRY_RUN=false", false)
  .action(async (postId: string, opts: { dryRun: boolean }) => {
    const dryRun = opts.dryRun || process.env.BTQ_SOCIAL_DRY_RUN !== "false";
    const registry = InviteRegistry.load();
    const post = findPost(loadAllCampaigns(), postId);
    const issues = validatePost(post, registry).filter((i) => i.level === "error");
    if (issues.length) {
      for (const i of issues) console.error(`ERROR ${i.message}`);
      process.exit(1);
    }

    for (const outlet of post.outlets) {
      const composed = composePost(post, registry, outlet);
      assertLength(composed, outlet);
      const publisher = getPublisher(outlet, dryRun);
      const result = await publisher.publish(composed);
      appendOutbox(result);
      if (!result.ok) {
        console.error(`FAILED ${outlet}: ${result.error}`);
        process.exitCode = 1;
      } else if (!dryRun) {
        console.log(`Published ${outlet}: ${result.url ?? result.externalId}`);
      }
    }
  });

program
  .command("queue")
  .description("Show or build the schedule queue from campaign scheduledAt fields")
  .option("--build", "Enqueue posts that have scheduledAt", false)
  .action((opts: { build: boolean }) => {
    const campaigns = loadAllCampaigns();
    if (opts.build) {
      for (const c of campaigns) {
        const added = enqueuePosts(c.posts, c.campaignId);
        console.log(`${c.campaignId}: enqueued ${added.length}`);
      }
    }
    for (const item of listQueue()) {
      console.log(`${item.scheduledAt}  ${item.status.padEnd(10)}  ${item.postId}`);
    }
  });

program
  .command("run-due")
  .description("Publish all queue items whose scheduledAt is due")
  .option("--dry-run", "Force dry-run", false)
  .action(async (opts: { dryRun: boolean }) => {
    const dryRun = opts.dryRun || process.env.BTQ_SOCIAL_DRY_RUN !== "false";
    const registry = InviteRegistry.load();
    const campaigns = loadAllCampaigns();
    const due = duePosts();
    if (!due.length) {
      console.log("Nothing due");
      return;
    }
    for (const item of due) {
      try {
        const post = findPost(campaigns, item.postId);
        for (const outlet of post.outlets) {
          const composed = composePost(post, registry, outlet);
          assertLength(composed, outlet);
          const result = await getPublisher(outlet, dryRun).publish(composed);
          appendOutbox(result);
          if (!result.ok) throw new Error(result.error ?? "publish failed");
        }
        markQueue(item.postId, "published");
        appendScheduleLog(`published ${item.postId}`);
      } catch (err) {
        markQueue(item.postId, "failed");
        appendScheduleLog(`failed ${item.postId}: ${err instanceof Error ? err.message : err}`);
        console.error(err);
        process.exitCode = 1;
      }
    }
  });

program.parseAsync(process.argv);
