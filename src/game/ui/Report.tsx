import { cn } from "@/lib/utils";
import { fmtClock, levelFor } from "../config";
import { OBJECTIVES, useGame, type ResKey } from "../store";
import { GameButton } from "./Button";

const LABELS: Record<ResKey, string> = { life: "Life support", power: "Power", safety: "Safety", food: "Food", water: "Water" };

export function Report() {
  const { mission: m, startMission, go } = useGame();
  const ok = m.outcome?.success ?? true;
  const lvl = levelFor(m.xp);
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[11px] tracking-[0.3em] text-secondary">MISSION27 · DEBRIEF · {fmtClock(m.time)}</p>
        <h1 className={cn("mt-2 font-logo text-4xl font-semibold sm:text-5xl", ok ? "text-success" : "text-destructive")}>
          {ok ? "Mission complete" : "Mission aborted"}
        </h1>
        <p className="mt-3 text-lg">{m.outcome?.reason ?? "Mission ended."}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="panel p-4">
            <h2 className="mb-2 font-mono text-xs tracking-[0.25em] text-muted-foreground">RESOURCES AT END</h2>
            {(Object.keys(LABELS) as ResKey[]).map((k) => (
              <div key={k} className="flex justify-between py-0.5 text-sm"><span>{LABELS[k]}</span><span className="font-mono">{Math.round(m.res[k])}%</span></div>
            ))}
            <div className="flex justify-between py-0.5 text-sm"><span>Crew stability</span><span className="font-mono">{Math.round(m.crewStability)}%</span></div>
          </section>
          <section className="panel p-4">
            <h2 className="mb-2 font-mono text-xs tracking-[0.25em] text-muted-foreground">PERFORMANCE</h2>
            <div className="flex justify-between py-0.5 text-sm"><span>Incidents resolved</span><span className="font-mono">{m.handled}/{m.fired.length}</span></div>
            <div className="flex justify-between py-0.5 text-sm"><span>Objectives</span><span className="font-mono">{m.done.length}/{OBJECTIVES.length}</span></div>
            <div className="flex justify-between py-0.5 text-sm"><span>Science</span><span className="font-mono">{Math.round(m.science)}</span></div>
            <div className="flex justify-between py-0.5 text-sm"><span>Experience</span><span className="font-mono">{m.xp} XP · {lvl.name}</span></div>
            <div className="flex justify-between py-0.5 text-sm"><span>Badges</span><span className="text-right">{m.badges.join(", ") || "—"}</span></div>
          </section>
        </div>

        <section className="panel mt-4 p-4">
          <h2 className="mb-2 font-mono text-xs tracking-[0.25em] text-muted-foreground">DECISION LOG</h2>
          {m.log.length === 0 && <p className="text-sm text-muted-foreground">No incidents recorded.</p>}
          <ol className="space-y-3">
            {m.log.map((e) => (
              <li key={e.id} className={cn("border-l-2 pl-3 text-sm", e.tone === "good" ? "border-success" : "border-destructive")}>
                <p className="font-display font-semibold">{fmtClock(e.at)} · {e.title}</p>
                <p className="text-muted-foreground">{e.happened} {e.did} {e.changed} {e.consequence}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 flex flex-wrap gap-3 pb-10">
          <GameButton variant="primary" onClick={() => startMission()}>Restart mission</GameButton>
          <GameButton variant="ghost" onClick={() => go("training")}>Train on Earth</GameButton>
          <GameButton variant="ghost" onClick={() => go("home")}>Return home</GameButton>
        </div>
        <p className="pb-6 text-center text-xs text-muted-foreground">Gameplay values are simplified simulations, not NASA operational thresholds. Independent educational project. Not affiliated with or endorsed by NASA.</p>
      </div>
    </div>
  );
}
