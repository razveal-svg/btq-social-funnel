# Architecture — BTQ Social Funnel

## Problem

Social posts that end on bitcoinquantum.com / docs / explorer / pool leak attention. The hub funnel says Discord is the hold layer. This app makes **leakage a compile/runtime error**: no tracked invite, no publish.

## Design principles

1. **One door per post.** `inviteLabel` is required. Composer owns the Discord URL; authors never paste raw invites into `body`.
2. **Bridge, then hub.** Optional `bridgeUrl` for product proof (pool, explorer, docs). Discord CTA is always last.
3. **Outlet-aware doors.** `x-bio` is not valid on LinkedIn; `event-ama` is fine on X + Telegram. Registry enforces `allowedOutlets`.
4. **Dry-run by default.** Live credentials are opt-in via `BTQ_SOCIAL_DRY_RUN=false`.
5. **Append-only outbox.** Every attempt (ok or fail) lands in `data/outbox.jsonl` for audit.

## Data flow

```
┌──────────────────┐
│ Campaign JSON    │  marketer-authored claims
└────────┬─────────┘
         │ loadAllCampaigns
         ▼
┌──────────────────┐
│ validatePost     │  invite exists, URL real, length, safety keywords
└────────┬─────────┘
         │ composePost
         ▼
┌──────────────────┐
│ finalText        │  body + bridgeUrl + ctaLine + invite.url
└────────┬─────────┘
         │ getPublisher(outlet, dryRun)
         ▼
┌──────────────────┐     ┌─────────────┐
│ X / Telegram /   │────▶│ outbox.jsonl│
│ DryRunPublisher  │     └─────────────┘
└──────────────────┘
```

## Mapping to hub funnel stages

| Social moment | App mechanism | Discord landing (after verify) |
|---------------|---------------|--------------------------------|
| Thesis / brand post | `inviteLabel: website-main` or `x-bio` | `#introductions` |
| Miner recruitment | `pool-main` + `intent: miner` | `#mining-pool` |
| Explorer screenshot | `explorer-main` | `#explorer-highlights` |
| “Stuck on setup” | `docs-help` / `pool-support` | `#help` |
| AMA promo | `event-ama` | Stage channels |

The app does **not** replace Discord onboarding (welcome → roles → first win). It only maximizes correct *entry*. Activation remains ops + server structure in `BTQ_DISCORD_SERVER_REPORT.md`.

## Publisher contract

```ts
interface Publisher {
  outlet: Outlet;
  publish(post: ComposedPost): Promise<PublishResult>;
}
```

- **DryRunPublisher** — always available; prints final text  
- **XPublisher** — OAuth 1.0a user-context `POST /2/tweets`  
- **TelegramPublisher** — `sendMessage` broadcast; still requires Discord CTA in text  
- **LinkedIn** — dry-run stub until API app is approved  

## Scheduler

`scheduledAt` on posts → `queue --build` → `data/queue.json` → cron `run-due`.

Idempotent enqueue by `postId`. Status: `pending | published | failed | skipped`.

## Extending

| Add… | Touch |
|------|--------|
| New Discord door | `data/invite-links.json` + `InviteLabel` in `types.ts` / zod enum |
| New outlet | `Outlet` type, publisher class, `getPublisher` |
| CTA tone | `CTA_BY_INTENT` / `CTA_BY_LABEL` in `cta.ts` |
| Markdown campaign import | new `src/posts/import-md.ts` reading twitter campaign packs |

## Trust boundaries

- Secrets only in `.env` (gitignored)  
- Invite JSON may be committed (public invite URLs)  
- Outbox may contain post text — treat as sensitive if drafts are embargoed  
- Never auto-DM Discord users from this app (anti-scam posture)
