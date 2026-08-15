import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { InviteDoor, InviteLabel, Outlet } from "./types.js";

const InviteSchema = z.object({
  label: z.string(),
  url: z.union([z.literal("REPLACE_WITH_DISCORD_INVITE"), z.string().url()]),
  postVerifyDestination: z.string(),
  allowedOutlets: z.array(z.enum(["x", "telegram", "linkedin"])),
  notes: z.string().optional(),
});

const FileSchema = z.object({
  invites: z.array(InviteSchema).min(1),
});

export class InviteRegistry {
  private byLabel = new Map<string, InviteDoor>();

  constructor(invites: InviteDoor[]) {
    for (const invite of invites) {
      this.byLabel.set(invite.label, invite as InviteDoor);
    }
  }

  static load(path = process.env.BTQ_SOCIAL_INVITES_PATH ?? "./data/invite-links.json"): InviteRegistry {
    const abs = resolve(path);
    const raw = JSON.parse(readFileSync(abs, "utf8"));
    const parsed = FileSchema.parse(raw);
    return new InviteRegistry(parsed.invites as InviteDoor[]);
  }

  get(label: InviteLabel): InviteDoor {
    const door = this.byLabel.get(label);
    if (!door) {
      throw new Error(`Unknown invite label: ${label}. Add it to data/invite-links.json`);
    }
    return door;
  }

  assertUsable(label: InviteLabel, outlet: Outlet, opts?: { allowPlaceholder?: boolean }): InviteDoor {
    const door = this.get(label);
    if (!door.allowedOutlets.includes(outlet)) {
      throw new Error(
        `Invite "${label}" is not allowed on outlet "${outlet}". Allowed: ${door.allowedOutlets.join(", ")}`,
      );
    }
    const placeholder = door.url === "REPLACE_WITH_DISCORD_INVITE" || !door.url.startsWith("https://discord.gg/");
    if (placeholder && !opts?.allowPlaceholder) {
      throw new Error(
        `Invite "${label}" has no real Discord URL yet. Create a tracked invite and update data/invite-links.json`,
      );
    }
    return door;
  }

  list(): InviteDoor[] {
    return [...this.byLabel.values()];
  }
}
