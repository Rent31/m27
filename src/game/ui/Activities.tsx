import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { audio } from "../audio";
import type { Activity, ActivityKind } from "../store";
import { GameButton } from "./Button";

type Done = (r: Record<string, unknown>) => void;
interface GameProps { context: Activity["context"]; done: Done }

const META: Record<ActivityKind, { title: string; icon: string; brief: string; learned: string }> = {
  leak: { title: "Find the Leak", icon: "🫁", brief: "One module is losing pressure. Watch the gauges and close the valve on the leaking module.",
    learned: "Habitats hold air at about 101 kPa — like sea level on Earth. Isolating the leaking module protects everyone else. Read the data first, then act." },
  power: { title: "Route the Power", icon: "⚡", brief: "Solar output is limited. Share the available power. Life support needs at least 4 kW.",
    learned: "A lunar night lasts ~14 Earth days, so outposts must budget power. Life support is never optional — then you choose between food, science and comfort." },
  greenhouse: { title: "Balance the Crops", icon: "🥬", brief: "Adjust water, light and nutrients until every bar is in the green zone, then hold it steady.",
    learned: "Plants need water, light and nutrients in balance. On the Moon, LED lights replace sunlight and almost all water is recycled." },
  radiation: { title: "Radiation Shelter", icon: "☢", brief: "A solar particle event is coming. Send every crew member to the shielded shelter and secure the science gear.",
    learned: "The Moon has no thick atmosphere or global magnetic field. Dense shielding like water and regolith protects crew from solar particles." },
  eva: { title: "Suit Check", icon: "🧑‍🚀", brief: "Before you step outside, check oxygen, cooling and suit battery.",
    learned: "A spacesuit is a personal spacecraft: it supplies oxygen, removes heat with a water cooling loop, and runs on batteries. Check all three before every EVA." },
  wires: { title: "Repair the Wiring", icon: "🔧", brief: "Reconnect each connector to its matching port. Click a plug, then its port.",
    learned: "Good repairs follow a process: isolate power, match connectors carefully, then test the system before declaring it fixed." },
  command: { title: "Command Triage", icon: "🛰", brief: "Four alerts arrived at once. Click them from most to least urgent.",
    learned: "Mission control triages: keep the crew alive first (air), then power, then food, then science. Priorities keep a base calm." },
  conflict: { title: "Crew Conflict", icon: "🤝", brief: "Maya wants power for repairs. Leo wants it for his experiment. How do you lead?",
    learned: "Crew wellbeing is a system too. Listening to everyone and making fair plans keeps a team working together for months." },
};

export function ActivityModal({ activity, onFinish, onClose }: { activity: Activity; onFinish: Done; onClose: () => void }) {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const meta = META[activity.kind];
  const done: Done = (r) => { audio.sfx("success"); setResult(r); };
  const props = { context: activity.context, done };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/55 p-4 backdrop-blur-[2px]">
      <div className="panel w-full max-w-2xl p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">{activity.context === "training" ? "EARTH TRAINING" : "LUNAR OUTPOST"}</p>
            <h2 className="text-2xl font-bold">{meta.icon} {meta.title}</h2>
          </div>
          {!result && <GameButton variant="ghost" className="px-3 py-1.5 text-sm" onClick={onClose}>Leave</GameButton>}
        </div>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-success/15 p-4">
              <p className="mb-1 font-mono text-xs font-bold tracking-widest text-success">WHAT YOU LEARNED</p>
              <p className="text-base">{meta.learned}</p>
            </div>
            <div className="flex justify-end"><GameButton variant="primary" onClick={() => onFinish(result)}>Continue ▸</GameButton></div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{meta.brief}</p>
            {activity.kind === "leak" && <LeakGame {...props} />}
            {activity.kind === "power" && <PowerGame {...props} />}
            {activity.kind === "greenhouse" && <GreenhouseGame {...props} />}
            {activity.kind === "radiation" && <RadiationGame {...props} />}
            {activity.kind === "eva" && <EvaGame {...props} />}
            {activity.kind === "wires" && <WiresGame {...props} />}
            {activity.kind === "command" && <CommandGame {...props} />}
            {activity.kind === "conflict" && <ConflictGame {...props} />}
          </>
        )}
      </div>
    </div>
  );
}

function useTicker(fn: (dt: number) => void, active = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => ref.current(0.1), 100);
    return () => clearInterval(id);
  }, [active]);
}

/* ---------- Leak ---------- */
function LeakGame({ done }: GameProps) {
  const modules = ["Galley", "Sleep Quarters", "Lab Tunnel", "Storage Bay"];
  const leak = useMemo(() => Math.floor(Math.random() * 4), []);
  const [p, setP] = useState([100, 100, 100, 100]);
  const [wrong, setWrong] = useState(0);
  const [shake, setShake] = useState(-1);
  const [msg, setMsg] = useState("");
  useTicker(() => setP((arr) => arr.map((v, i) => (i === leak ? Math.max(60, v - 0.9) : 99.4 + Math.random() * 1.2))));
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {modules.map((m, i) => {
          const v = p[i];
          return (
            <div key={m} className={cn("rounded-2xl border border-border bg-muted/60 p-3 text-center", shake === i && "anim-shake")}>
              <p className="font-display text-sm">{m}</p>
              <div className="relative mx-auto my-2 h-20 w-20 rounded-full border-4 border-border">
                <div className="absolute bottom-1/2 left-1/2 h-8 w-1 origin-bottom rounded bg-primary" style={{ transform: `translateX(-50%) rotate(${(v - 80) * 4.5}deg)` }} />
                <span className="absolute inset-x-0 bottom-1 font-mono text-xs">{(v * 1.013).toFixed(1)}</span>
              </div>
              <p className="mb-2 font-mono text-[10px] text-muted-foreground">kPa</p>
              <GameButton variant="ghost" className="w-full px-2 py-1.5 text-xs" onClick={() => {
                if (i === leak) done({ wrong });
                else { setWrong((w) => w + 1); setShake(i); audio.sfx("fail"); setMsg("That module is stable. Look for the needle that keeps falling."); setTimeout(() => setShake(-1), 600); }
              }}>CLOSE VALVE</GameButton>
            </div>
          );
        })}
      </div>
      {msg && <p className="mt-3 text-sm text-warning">{msg}</p>}
    </div>
  );
}

/* ---------- Power ---------- */
function PowerGame({ done }: GameProps) {
  const budget = 10;
  const [a, setA] = useState({ life: 2, greenhouse: 2, science: 2, heaters: 2 });
  const total = Object.values(a).reduce((x, y) => x + y, 0);
  const sys: { k: keyof typeof a; label: string; icon: string }[] = [
    { k: "life", label: "Life Support", icon: "🫁" },
    { k: "greenhouse", label: "Greenhouse LEDs", icon: "🥬" },
    { k: "science", label: "Science Lab", icon: "🔬" },
    { k: "heaters", label: "Comfort Heaters", icon: "🔥" },
  ];
  const ok = a.life >= 4 && total <= budget;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 font-mono text-sm">
        <span>☀ Solar: {budget} kW</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full transition-all", total > budget ? "bg-destructive" : "bg-warning")} style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
        </div>
        <span className={total > budget ? "text-destructive" : ""}>{total}/{budget} kW</span>
      </div>
      <div className="space-y-2">
        {sys.map((s) => (
          <div key={s.k} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2">
            <span className="w-40 font-display">{s.icon} {s.label}</span>
            <div className="flex flex-1 gap-1">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className={cn("h-4 flex-1 rounded", i < a[s.k] ? "bg-warning" : "bg-background/60")} />)}
            </div>
            <button className="h-8 w-8 rounded-lg bg-accent font-bold" onClick={() => { audio.sfx("click"); setA({ ...a, [s.k]: Math.max(s.k === "life" ? 1 : 0, a[s.k] - 1) }); }}>−</button>
            <button className="h-8 w-8 rounded-lg bg-accent font-bold" onClick={() => { audio.sfx("click"); setA({ ...a, [s.k]: Math.min(6, a[s.k] + 1) }); }}>+</button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{a.life < 4 ? "⚠ Life support needs at least 4 kW." : total > budget ? "⚠ You're using more power than the arrays make." : "Load plan looks safe."}</p>
      <div className="mt-3 flex justify-end">
        <GameButton variant="primary" disabled={!ok} onClick={() => {
          const priority = a.life >= 6 ? "life" : a.greenhouse >= a.science ? "greenhouse" : "science";
          done({ priority });
        }}>Apply Load Plan</GameButton>
      </div>
    </div>
  );
}

/* ---------- Greenhouse ---------- */
function GreenhouseGame({ done }: GameProps) {
  const bands = useMemo(() => ({ water: [50 + Math.random() * 15, 0] as number[], light: [55 + Math.random() * 15, 0], nutrients: [30 + Math.random() * 15, 0] }), []);
  Object.values(bands).forEach((b) => (b[1] = b[0] + 18));
  const [v, setV] = useState({ water: 20, light: 90, nutrients: 80 });
  const [hold, setHold] = useState(0);
  const inBand = (k: keyof typeof v) => v[k] >= bands[k][0] && v[k] <= bands[k][1];
  const all = inBand("water") && inBand("light") && inBand("nutrients");
  useTicker((dt) => setHold((h) => (all ? h + dt : 0)));
  useEffect(() => { if (hold >= 1.5) done({}); }, [hold]); // eslint-disable-line react-hooks/exhaustive-deps
  const health = (["water", "light", "nutrients"] as const).filter(inBand).length;
  const hint = (k: keyof typeof v) => (inBand(k) ? "Good" : v[k] < bands[k][0] ? "Too low" : "Too high");
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
      <div className="space-y-4">
        {(["water", "light", "nutrients"] as const).map((k) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-sm"><span className="font-display capitalize">{k === "water" ? "💧" : k === "light" ? "💡" : "🧪"} {k}</span><span className={inBand(k) ? "text-success" : "text-warning"}>{hint(k)}</span></div>
            <div className="relative">
              <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded bg-success/30" style={{ left: `${bands[k][0]}%`, width: `${bands[k][1] - bands[k][0]}%` }} />
              <input type="range" min={0} max={100} value={v[k]} onChange={(e) => setV({ ...v, [k]: +e.target.value })} className="relative w-full accent-[var(--primary)]" />
            </div>
          </div>
        ))}
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-success transition-all" style={{ width: `${Math.min(100, (hold / 1.5) * 100)}%` }} /></div>
      </div>
      <div className="flex items-end justify-center rounded-2xl bg-muted/60 p-3">
        <svg viewBox="0 0 100 120" className="h-36 w-full">
          <rect x="25" y="95" width="50" height="22" rx="4" className="fill-[var(--accent)]" />
          <path d={`M50 95 Q ${50 - health * 2} ${80 - health * 8} 50 ${70 - health * 14}`} stroke="var(--success)" strokeWidth="4" fill="none" />
          {Array.from({ length: health + 1 }, (_, i) => (
            <ellipse key={i} cx={i % 2 ? 62 : 38} cy={88 - i * 14} rx={10 + health * 2} ry="6" fill={health === 3 ? "var(--success)" : "var(--warning)"} transform={`rotate(${i % 2 ? -25 : 25} ${i % 2 ? 62 : 38} ${88 - i * 14})`} />
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ---------- Radiation ---------- */
function RadiationGame({ context, done }: GameProps) {
  const crew = ["Maya", "Leo", "Nova", "Ari"];
  const start = useMemo(() => crew.map(() => ({ x: 10 + Math.random() * 55, y: 15 + Math.random() * 65 })), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [safe, setSafe] = useState<boolean[]>([false, false, false, false]);
  const [secured, setSecured] = useState(false);
  const [rad, setRad] = useState(5);
  useTicker((dt) => setRad((r) => Math.min(100, r + dt * 4)));
  const ready = safe.every(Boolean) && secured;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 font-mono text-sm">
        <span>☢ Dose rate</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-destructive transition-all" style={{ width: `${rad}%` }} /></div>
      </div>
      <div className="relative h-56 overflow-hidden rounded-2xl border border-border bg-muted/50">
        <div className="absolute right-3 top-3 bottom-3 flex w-28 items-start justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/10 pt-2 font-display text-xs text-secondary">SHIELDED SHELTER</div>
        {crew.map((c, i) => (
          <button key={c} onClick={() => { audio.sfx("beep"); setSafe((s) => s.map((v, j) => (j === i ? true : v))); }}
            className="absolute flex h-12 w-12 flex-col items-center justify-center rounded-full bg-card text-[10px] font-bold shadow-lg transition-all duration-700 hover:scale-110"
            style={safe[i] ? { left: "calc(100% - 7rem)", top: `${20 + i * 22}%` } : { left: `${start[i].x}%`, top: `${start[i].y}%` }}>
            🧑‍🚀<span>{c}</span>
          </button>
        ))}
        <button onClick={() => { audio.sfx("beep"); setSecured(true); }} className={cn("absolute bottom-3 left-3 rounded-lg px-3 py-2 font-display text-xs", secured ? "bg-success/30 text-success" : "bg-warning text-primary-foreground")}>
          {secured ? "✓ Equipment secured" : "🔬 Secure science gear"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Click each crew member to send them to the shelter.</p>
      {ready && (context === "training" ? (
        <div className="mt-3 flex justify-end"><GameButton variant="primary" onClick={() => done({ choice: "safety" })}>All safe ✓</GameButton></div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <GameButton variant="secondary" onClick={() => done({ choice: "safety" })}>🛡 SAFETY FIRST<span className="text-xs font-normal">pause science</span></GameButton>
          <GameButton variant="primary" onClick={() => done({ choice: "science" })}>🔬 CONTINUE SCIENCE<span className="text-xs font-normal">risk dose</span></GameButton>
        </div>
      ))}
    </div>
  );
}

/* ---------- EVA ---------- */
function EvaGame({ done }: GameProps) {
  const [o2, setO2] = useState(30);
  const [holding, setHolding] = useState(false);
  const [cool, setCool] = useState<"idle" | "testing" | "ok">("idle");
  const [bat, setBat] = useState<number | null>(null);
  const batteries = useMemo(() => [62, 97, 41].sort(() => Math.random() - 0.5), []);
  useTicker((dt) => { if (holding) setO2((v) => Math.min(100, v + dt * 45)); });
  const batOk = bat !== null && batteries[bat] >= 90;
  const all = o2 >= 100 && cool === "ok" && batOk;
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/60 p-3">
        <div className="mb-2 flex justify-between font-display"><span>🫁 Oxygen tank</span><span className="font-mono">{Math.round(o2)}%</span></div>
        <div className="mb-2 h-3 overflow-hidden rounded-full bg-background/60"><div className="h-full bg-secondary" style={{ width: `${o2}%` }} /></div>
        <GameButton variant="ghost" className="w-full select-none" disabled={o2 >= 100}
          onPointerDown={() => setHolding(true)} onPointerUp={() => setHolding(false)} onPointerLeave={() => setHolding(false)}>
          {o2 >= 100 ? "✓ Full" : "Hold to fill"}
        </GameButton>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3">
        <span className="font-display">❄ Cooling loop</span>
        <GameButton variant="ghost" className="py-1.5 text-sm" disabled={cool !== "idle"} onClick={() => { setCool("testing"); setTimeout(() => { setCool("ok"); audio.sfx("beep"); }, 1400); }}>
          {cool === "idle" ? "Run test" : cool === "testing" ? "Circulating…" : "✓ Flow nominal"}
        </GameButton>
      </div>
      <div className="rounded-xl bg-muted/60 p-3">
        <p className="mb-2 font-display">🔋 Pick a suit battery</p>
        <div className="grid grid-cols-3 gap-2">
          {batteries.map((b, i) => (
            <button key={i} onClick={() => { setBat(i); audio.sfx(b >= 90 ? "beep" : "fail"); }} className={cn("rounded-lg border p-2 font-mono text-sm", bat === i ? (b >= 90 ? "border-success bg-success/20" : "border-destructive bg-destructive/20") : "border-border bg-background/40")}>
              {b}%
            </button>
          ))}
        </div>
        {bat !== null && !batOk && <p className="mt-2 text-xs text-warning">Too low for a safe EVA — pick a fuller battery.</p>}
      </div>
      <div className="flex justify-end"><GameButton variant="primary" disabled={!all} onClick={() => done({})}>Suit Ready ▸</GameButton></div>
    </div>
  );
}

/* ---------- Wires ---------- */
const WIRE_COLORS = ["var(--primary)", "var(--secondary)", "var(--warning)", "var(--destructive)"];
function WiresGame({ done }: GameProps) {
  const right = useMemo(() => [0, 1, 2, 3].sort(() => Math.random() - 0.5), []);
  const [sel, setSel] = useState<number | null>(null);
  const [links, setLinks] = useState<Record<number, number>>({});
  const [bad, setBad] = useState(false);
  useEffect(() => { if (Object.keys(links).length === 4) setTimeout(() => done({}), 400); }, [links]); // eslint-disable-line react-hooks/exhaustive-deps
  const y = (i: number) => 20 + i * 45;
  return (
    <div className={cn("relative rounded-2xl bg-muted/60 p-4", bad && "anim-shake")}>
      <svg viewBox="0 0 300 180" className="w-full">
        {Object.entries(links).map(([l, r]) => (
          <path key={l} d={`M40 ${y(+l)} C 150 ${y(+l)}, 150 ${y(r)}, 260 ${y(r)}`} stroke={WIRE_COLORS[+l]} strokeWidth="6" fill="none" strokeLinecap="round" />
        ))}
        {[0, 1, 2, 3].map((c) => (
          <g key={c} onClick={() => { audio.sfx("click"); setSel(c); }} className="cursor-pointer">
            <rect x="10" y={y(c) - 12} width="30" height="24" rx="5" fill={WIRE_COLORS[c]} stroke={sel === c ? "var(--foreground)" : "none"} strokeWidth="3" />
          </g>
        ))}
        {right.map((c, i) => (
          <g key={c} className="cursor-pointer" onClick={() => {
            if (sel === null) return;
            if (sel === c) { audio.sfx("beep"); setLinks({ ...links, [c]: i }); setSel(null); }
            else { audio.sfx("fail"); setBad(true); setTimeout(() => setBad(false), 500); }
          }}>
            <rect x="260" y={y(i) - 12} width="30" height="24" rx="5" fill="var(--background)" stroke={WIRE_COLORS[c]} strokeWidth="4" />
          </g>
        ))}
      </svg>
      <p className="text-center text-sm text-muted-foreground">{Object.keys(links).length}/4 connected</p>
    </div>
  );
}

/* ---------- Command ---------- */
function CommandGame({ done }: GameProps) {
  const alerts = useMemo(() => [
    { id: 0, t: "🫁 CO₂ scrubber fault in Habitat" },
    { id: 1, t: "⚡ Battery reserve at 40%" },
    { id: 2, t: "🥬 Greenhouse humidity high" },
    { id: 3, t: "🔬 Science data backlog" },
  ].sort(() => Math.random() - 0.5), []);
  const [next, setNext] = useState(0);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (next === 4) setTimeout(() => done({}), 300); }, [next]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <button key={a.id} disabled={a.id < next} onClick={() => {
          if (a.id === next) { audio.sfx("beep"); setNext(next + 1); setMsg(""); }
          else { audio.sfx("fail"); setMsg("Ask yourself: what keeps the crew alive right now?"); }
        }} className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left font-display transition", a.id < next ? "border-success bg-success/15 opacity-70" : "border-border bg-muted/60 hover:bg-accent")}>
          <span>{a.t}</span>{a.id < next && <span className="font-mono text-sm text-success">#{a.id + 1} ✓</span>}
        </button>
      ))}
      {msg && <p className="text-sm text-warning">{msg}</p>}
    </div>
  );
}

/* ---------- Conflict ---------- */
function ConflictGame({ done }: GameProps) {
  const options = [
    { id: "listen", t: "Listen to both, then build a shared schedule", fb: "Both feel heard. The plan sticks." },
    { id: "rotate", t: "Set up a rotating power schedule", fb: "Fair and simple. A little grumbling, but it works." },
    { id: "side", t: "Pick Maya's side — repairs matter most", fb: "Leo feels ignored and goes quiet." },
  ];
  const [pick, setPick] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/60 p-3 text-sm">
        <p><b className="font-display text-secondary">Maya:</b> "If we don't fix the array wiring today, we'll lose power tonight."</p>
        <p className="mt-1"><b className="font-display text-warning">Leo:</b> "This experiment only works during this sunlight window!"</p>
      </div>
      {options.map((o) => (
        <button key={o.id} disabled={!!pick} onClick={() => { audio.sfx("click"); setPick(o.id); }} className={cn("w-full rounded-xl border px-4 py-3 text-left font-display transition", pick === o.id ? "border-primary bg-primary/15" : "border-border bg-muted/60 hover:bg-accent")}>
          {o.t}
          {pick === o.id && <p className="mt-1 font-sans text-sm text-muted-foreground">{o.fb}</p>}
        </button>
      ))}
      {pick && <div className="flex justify-end"><GameButton variant="primary" onClick={() => done({ choice: pick })}>Continue</GameButton></div>}
    </div>
  );
}
