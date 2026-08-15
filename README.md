# BTQ Social Funnel

Automated basis for posting to social outlets **only if** every post opens a tracked Discord door.

Product rules come from [BTQ_DISCORD_HUB_FUNNEL.md](../BTQ_DISCORD_HUB_FUNNEL.md). This app encodes them in code: invite registry, CTA composition, validation, dry-run publish, X/Telegram adapters, and a schedule queue.

## What it does

```
campaign JSON  →  validate  →  compose (body + bridge URL + Discord CTA)
                                        ↓
                              dry-run | X | Telegram
                                        ↓
                                   outbox.jsonl
```

**Non-negotiable:** a post cannot publish without an `inviteLabel` that resolves to a real `discord.gg` URL allowed for that outlet. The composer strips any ad-hoc Discord links in the body and re-attaches the tracked invite last.

## Quick start

```powershell
cd btq-social-funnel
copy .env.example .env
npm install
npm run invites
npm run validate
npm run preview -- thesis-hook
npm run publish:dry -- thesis-hook
```

Live X publish (after filling `.env` X credentials):

```powershell
$env:BTQ_SOCIAL_DRY_RUN="false"
npx tsx src/cli.ts publish thesis-hook
```

## CLI

| Command | Purpose |
|---------|---------|
| `invites` | List Discord doors + which still need URLs |
| `validate` | Fail CI-style if CTA/invite/length/safety breaks |
| `preview <postId>` | Print final funnel text |
| `publish <postId> [--dry-run]` | Publish to configured outlets |
| `queue [--build]` | Build/show schedule from `scheduledAt` |
| `run-due [--dry-run]` | Publish due queue items (cron entrypoint) |

## Content model

Campaigns live in `content/campaigns/*.json`:

```json
{
  "id": "thesis-hook",
  "title": "Hook / thesis",
  "body": "Post text WITHOUT a Discord link",
  "outlets": ["x"],
  "inviteLabel": "x-bio",
  "intent": "curious",
  "bridgeUrl": "https://bitcoinquantum.com"
}
```

| Field | Role |
|-------|------|
| `body` | Claim / hook only |
| `bridgeUrl` | Optional mid-funnel (site, docs, pool, explorer) |
| `inviteLabel` | Which Discord door (see `data/invite-links.json`) |
| `intent` | Picks CTA tone: curious / miner / developer / researcher |

Final order is always: **body → bridge → CTA line → discord invite**.

## Invite doors

Seeded from the Discord server report + hub funnel. Awareness doors already have URLs (`website-main`, `x-bio`, …). Product doors (`pool-main`, `docs-help`, `explorer-main`, …) are placeholders until you create tracked invites in Discord and paste URLs into `data/invite-links.json`.

```powershell
npm run invites
```

## Cron (automation)

1. Put `scheduledAt` (ISO) on posts  
2. `npx tsx src/cli.ts queue --build`  
3. Hourly: `npx tsx src/cli.ts run-due`  

Keep `BTQ_SOCIAL_DRY_RUN=true` until you trust the queue.

## Layout

```
btq-social-funnel/
├── content/campaigns/     # post packs
├── data/invite-links.json # tracked Discord doors
├── src/
│   ├── cli.ts
│   ├── cta.ts             # mandatory Discord CTA compositor
│   ├── invites.ts
│   ├── posts/             # load + validate
│   ├── publishers/        # dry-run, x, telegram
│   └── scheduler/         # queue + run-due
└── ARCHITECTURE.md
```

## Next increments (not in v0)

- Media upload for X (campaign assets from `bitcoinquantum-infographics`)
- LinkedIn adapter (stub returns dry-run today)
- Import helper from `btq-twitter-campaign/TWITTER_CAMPAIGN.md`
- Discord bot hook: when invite joins spike, post a staff ping in `#mod-chat`
- Tiny web UI for marketers to queue without CLI

## Safety

- Rejects bodies that look like seed-phrase / DM-scam bait  
- Never invents invite URLs  
- Telegram is broadcast-only; Discord remains the support hub per funnel design
