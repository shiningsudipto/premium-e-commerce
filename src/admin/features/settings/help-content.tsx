"use client";

import { Inline } from "../guides/guide-view";
import type { SettingHelp } from "./setting-help";

// The body of a setting's or flag's explanation: what it is, why it matters, what it does, a
// recommendation and pitfalls. Shared by Settings (inline panel) and Feature flags (popover).
export function HelpContent({ help }: { help: SettingHelp }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <p>
        <Inline text={help.what} />
      </p>
      <div>
        <h3 className="font-medium">Why it matters</h3>
        <p className="text-muted-foreground">
          <Inline text={help.why} />
        </p>
      </div>
      <div>
        <h3 className="font-medium">What it does</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {help.effects.map((e, i) => (
            <li key={i}>
              <Inline text={e} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-medium">Recommended</h3>
        <p className="text-muted-foreground">
          <Inline text={help.recommended} />
        </p>
      </div>
      {help.caution && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <span className="font-medium">Watch out: </span>
          <Inline text={help.caution} />
        </p>
      )}
    </div>
  );
}
