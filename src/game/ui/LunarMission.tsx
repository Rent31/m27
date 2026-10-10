import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MISSION_END_MIN, fmtClock, levelFor } from "../config";
import { audio } from "../audio";
import { OBJECTIVES, useGame, type ResKey } from "../store";
import { BASE_RADIUS, world } from "../world";
import { LunarWorld } from "../three/LunarWorld";
import { ActivityModal } from "./Activities";
import { GameButton, KeyCap, MusicToggle, useAudioSettings } from "./Button";
import { Handbook } from "./Handbook";
import { AdvancedOpsPanel } from "./AdvancedOpsPanel";

const RES: { k: ResKey; icon: string; label: string }[] = [
  { k: "life", icon: "🫁", label: "Life" },
  { k: "power", icon: "⚡", label: "Power" },
  { k: "safety", icon: "☢", label: "Safety" },
  { k: "food", icon: "🥬", label: "Food" },
  { k: "water", icon: "💧", label: "Water" },
];

export function LunarMission() {
  const s = useGame();
  const { mission: m, activity, dialogue, prompt, paused, handbook, toast } = s;
  const [opsOpen, setOpsOpen] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => useGame.getState().tick(0.1), 100);
    const save = setInterval(() => { const st = useGame.getState(); if (st.screen === "lunar") st.saveGame(); }, 8000);
    const alarm = setInterval(() => { const st = useGame.getState(); if (st.mission.emergency && !st.paused) audio.sfx("alarm"); }, 3000);
    const onKey = (e: KeyboardEvent) => {
      const st = useGame.getState();
      if (e.key === "Enter") {
        e.preventDefault();
        if (st.paused || st.activity || st.handbook) return;
        if (st.dialogue) { st.nextDialogue(); return; }
        if (st.prompt) st.interact(st.prompt.id);
      } else if (e.key === "Escape") {
        if (st.handbook) st.setHandbook(false);
        else if (st.activity) st.openActivity(null);
        else if (st.dialogue) useGame.setState({ dialogue: null });
        else st.setPaused(!st.paused);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearInterval(tick); clearInterval(save); clearInterval(alarm); window.removeEventListener("keydown", onKey); };
  }, []);

  const lvl = levelFor(m.xp);
  const active = OBJECTIVES.filter((o) => !m.done.includes(o.id)).slice(0, 3);

  return (
    <div className="fixed inset-0">
      <Canvas shadows camera={{ position: [2, 10, 14], fov: 50, far: 600 }} dpr={[1, 1.75]}>
        <LunarWorld />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 p-3 sm:p-4">
        {/* top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="panel px-4 py-2.5">
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">MISSION</p>
            <p className="font-mono text-2xl font-bold leading-tight">{fmtClock(m.time)}</p>
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(m.time / MISSION_END_MIN) * 100}%` }} /></div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">ends at H27:00</p>
          </div>
          <div className="panel hidden gap-3 px-4 py-2.5 md:flex">
            {RES.map((r) => {
              const v = m.res[r.k];
              return (
                <div key={r.k} className="w-16">
                  <div className="flex items-center justify-between text-xs"><span>{r.icon}</span><span className={cn("font-mono font-bold", v < 30 ? "text-destructive" : v < 55 ? "text-warning" : "")}>{Math.round(v)}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full transition-all", v < 30 ? "bg-destructive" : v < 55 ? "bg-warning" : "bg-secondary")} style={{ width: `${v}%` }} /></div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{r.label}</p>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <MusicToggle />
              <button onClick={() => setOpsOpen(true)} className="rounded-full border border-secondary/40 bg-card/80 px-3 py-1.5 font-mono text-xs font-bold text-secondary transition hover:bg-secondary/10">OPS CONSOLE</button>
              <button onClick={() => s.setPaused(true)} className="rounded-full border border-border bg-card/80 px-3 py-1.5 font-mono text-xs font-bold hover:bg-accent">ESC · MENU</button>
            </div>
            <div className="panel px-3 py-2 text-right">
              <p className="font-display text-sm">{s.custom.name} · <span className="text-primary">{lvl.name}</span></p>
              <p className="font-mono text-xs text-muted-foreground">{m.xp} XP{lvl.next ? ` / ${lvl.next}` : ""}</p>
              {m.badges.length > 0 && <p className="mt-1 text-xs">{m.badges.map((b) => "🏅").join("")}</p>}
            </div>
          </div>
        </div>

        {/* mobile resources */}
        <div className="panel mt-2 flex justify-between px-3 py-1.5 font-mono text-xs md:hidden">
          {RES.map((r) => <span key={r.k}>{r.icon}{Math.round(m.res[r.k])}</span>)}
        </div>

        {/* emergency banner */}
        {m.emergency && (
          <div className="absolute left-1/2 top-28 w-[min(92vw,520px)] -translate-x-1/2">
            <div className="anim-alert rounded-2xl border-2 border-destructive bg-destructive/20 px-5 py-3 text-center backdrop-blur">
              <p className="font-mono text-xs font-bold tracking-[0.3em] text-destructive">⚠ ALERT</p>
              <p className="font-display text-xl font-bold">{m.emergency.title}</p>
              <p className="text-sm">{m.emergency.hint}</p>
              <p className="mt-1 text-xs text-muted-foreground">Follow the red marker ▾</p>
            </div>
          </div>
        )}

        {/* objectives */}
        <div className="absolute left-3 top-32 w-64 sm:left-4">
          <div className="panel p-3">
            <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground">OBJECTIVES</p>
            {active.map((o, i) => (
              <div key={o.id} className={cn("flex items-start gap-2 py-1 text-sm", i === 0 && !m.emergency && "text-secondary")}>
                <span>{i === 0 && !m.emergency ? "◆" : "◇"}</span><span>{o.label}</span>
              </div>
            ))}
            {active.length === 0 && <p className="text-sm text-muted-foreground">All objectives done! Keep the base healthy until H27:00.</p>}
            <p className="mt-2 border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">🪨 samples {m.samples} · 🔬 science {Math.round(m.science)} · 🤝 crew {Math.round(m.crewStability)}</p>
            {m.inRover ? <p className="mt-1 text-xs text-warning">🚙 Driving rover</p> : m.evaReady ? <EvaStatus /> : null}
          </div>
        </div>

        {/* bottom: prompt + toast + controls */}
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
          {toast && <Toast key={toast.id} text={toast.text} tone={toast.tone} />}
          {prompt && !activity && !dialogue && !paused && (
            <button className="panel pointer-events-auto flex items-center gap-3 px-5 py-3 font-display text-base sm:text-lg anim-float" onClick={() => s.interact(prompt.id)}>
              <KeyCap>ENTER</KeyCap> {prompt.label}
            </button>
          )}
        </div>
        <div className="absolute bottom-4 left-4 hidden text-xs text-muted-foreground lg:block">
          <span className="panel flex items-center gap-2 px-3 py-2"><KeyCap>WASD</KeyCap> move <KeyCap>SHIFT</KeyCap> run <KeyCap>ENTER</KeyCap> interact <KeyCap>ESC</KeyCap> menu</span>
        </div>

        {dialogue && (
          <div className="pointer-events-auto absolute inset-x-0 bottom-6 mx-auto w-[min(94vw,640px)]">
            <button className="panel w-full p-5 text-left" onClick={() => s.nextDialogue()}>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: dialogue.accent }} />
                <span className="font-display text-lg font-bold">{dialogue.name}</span>
                <span className="text-xs text-muted-foreground">{dialogue.role}</span>
              </div>
              <p className="text-lg">{dialogue.lines[dialogue.idx]}</p>
              <p className="mt-2 text-right text-xs text-muted-foreground"><KeyCap>ENTER</KeyCap> {dialogue.idx + 1 < dialogue.lines.length ? "next" : "close"}</p>
            </button>
          </div>
        )}
      </div>

      {activity && <ActivityModal activity={activity} onFinish={s.finishActivity} onClose={() => s.openActivity(null)} />}
      {paused && !handbook && <PauseMenu />}
      {handbook && <Handbook onClose={() => s.setHandbook(false)} />}
      {opsOpen && <AdvancedOpsPanel mission={m} onClose={() => setOpsOpen(false)} />}
    </div>
  );
}

function EvaStatus() {
  const [out, setOut] = useState(false);
  useEffect(() => { const id = setInterval(() => setOut(Math.hypot(world.player.x, world.player.z) > BASE_RADIUS), 500); return () => clearInterval(id); }, []);
  return <p className={cn("mt-1 text-xs", out ? "text-warning" : "text-success")}>{out ? "🧑‍🚀 On EVA — suit nominal" : "✓ Suit ready for EVA"}</p>;
}

function Toast({ text, tone }: { text: string; tone: "info" | "good" | "bad" }) {
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 4200); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <div className={cn("panel max-w-xl px-4 py-2 text-center text-sm", tone === "good" && "border-success/60", tone === "bad" && "border-destructive/60")}>{text}</div>
  );
}

function PauseMenu() {
  const s = useGame();
  const a = useAudioSettings();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-sm p-6">
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">PAUSED · {fmtClock(s.mission.time)}</p>
        <h2 className="mb-5 text-3xl font-bold">Mission Control</h2>
        <div className="flex flex-col gap-2">
          <GameButton variant="primary" onClick={() => s.setPaused(false)}>▶ Resume</GameButton>
          <GameButton variant="ghost" onClick={() => s.setHandbook(true)}>📘 Handbook</GameButton>
          {confirm ? (
            <div className="flex gap-2">
              <GameButton variant="ghost" className="flex-1" onClick={() => setConfirm(false)}>Cancel</GameButton>
              <GameButton variant="danger" className="flex-1" onClick={() => s.startMission()}>Restart</GameButton>
            </div>
          ) : <GameButton variant="ghost" onClick={() => setConfirm(true)}>↺ Restart mission</GameButton>}
          <GameButton variant="ghost" onClick={() => s.leaveToHome()}>⌂ Leave to Home (saves)</GameButton>
        </div>
        <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
          <label className="flex items-center justify-between gap-3">Music<input type="range" min={0} max={1} step={0.05} value={a.musicVol} onChange={(e) => audio.update({ musicVol: +e.target.value, music: true })} className="w-40 accent-[var(--primary)]" /></label>
          <label className="flex items-center justify-between gap-3">Sound effects<input type="range" min={0} max={1} step={0.05} value={a.sfxVol} onChange={(e) => audio.update({ sfxVol: +e.target.value, sfx: true })} className="w-40 accent-[var(--primary)]" /></label>
          <label className="flex items-center justify-between">Mute sound effects<input type="checkbox" checked={!a.sfx} onChange={(e) => audio.update({ sfx: !e.target.checked })} /></label>
        </div>
      </div>
    </div>
  );
}
