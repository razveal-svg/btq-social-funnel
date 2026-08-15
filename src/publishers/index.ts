import type { Outlet } from "../types.js";
import type { Publisher } from "./base.js";
import { DryRunPublisher } from "./dry-run.js";
import { TelegramPublisher } from "./telegram.js";
import { XPublisher } from "./x.js";

export function getPublisher(outlet: Outlet, dryRun: boolean): Publisher {
  if (dryRun || process.env.BTQ_SOCIAL_DRY_RUN === "true") {
    return new DryRunPublisher(outlet);
  }
  switch (outlet) {
    case "x":
      return new XPublisher();
    case "telegram":
      return new TelegramPublisher();
    case "linkedin":
      return new DryRunPublisher("linkedin"); // stub until LinkedIn app approved
    default: {
      const _exhaustive: never = outlet;
      throw new Error(`No publisher for ${_exhaustive}`);
    }
  }
}
