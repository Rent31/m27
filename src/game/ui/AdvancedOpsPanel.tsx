import { useState } from "react";
import { Activity, AlertTriangle, BookOpen, CheckCircle2, Gauge, Radio, Shield, Users, Wind, X, Zap } from "lucide-react";
import { CREW } from "../world";
import { fmtClock } from "../config";
import type { Mission, ResKey } from "../store";

type Tab = "telemetry" | "protocols" | "crew";

const RESOURCE_META: { key: ResKey; label: string; unit: string; icon: typeof Wind; color: string; meaning: string }[] = [
  { key: "life", label: "LIFE SUPPORT", unit: "%", icon: Wind, color: "#63d8c4", meaning: "Crew atmosphere and life-support margin" },
  { key: "power", label: "POWER BUS", unit: "%", icon: Zap, color: "#ffc46b", meaning: "Available electrical power reserve" },
  { key: "safety", label: "RADIATION SAFETY", unit: "%", icon: Shield, color: "#ff8d87", meaning: "Protective margin and shelter readiness" },
  { key: "food", label: "FOOD SUPPLY", unit: "%", icon: Activity, color: "#a7dc7a", meaning: "Food stocks and greenhouse output" },
  { key: "water", label: "WATER RECOVERY", unit: "%", icon: Gauge, color: "#83caff", meaning: "Usable water and recovery reserve" },
];

const PROTOCOLS = [
  { title: "Rapid depressurization", code: "LIFE-01", steps: ["Identify the affected module and confirm the pressure trend.", "Close or isolate the leaking hatch if safe to do so.", "Move the crew away from the compromised compartment.", "Recheck life-support margin before resuming other work." ] },
  { title: "Solar particle event", code: "RAD-02", steps: ["Check the radiation alert and event severity.", "Suspend non-essential EVA and surface activity.", "Move the crew to the most shielded available area.", "Resume activity only after the event risk is reassessed." ] },
  { title: "Power failure", code: "PWR-03", steps: ["Inspect generation and storage status.", "Prioritize life support and critical habitat systems.", "Reduce non-essential science and comfort loads.", "Restore balanced power only when reserve stabilizes." ] },
  { title: "Greenhouse crop stress", code: "BIO-04", steps: ["Inspect water delivery, lighting and nutrient status.", "Protect essential life-support loads before reallocating power.", "Correct the failing growth condition.", "Recheck crop health and resource reserves." ] },
  { title: "EVA suit cooling failure", code: "EVA-05", steps: ["Stop the current surface task immediately.", "Return to the airlock using the safest route.", "End EVA and inspect the suit cooling loop.", "Do not redeploy until the suit passes its checks." ] },
];

export function AdvancedOpsPanel({ mission, onClose }: { mission: Mission; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("telemetry");
  const [protocol, setProtocol] = useState(0);
  const activeProtocol = PROTOCOLS[protocol];
  const recent = [...mission.log].slice(-5).reverse();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#02060c]/80 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label="Advanced mission operations console">
      <section className="ops-console flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border border-cyan-300/25 bg-[#07111d]/95 text-slate-100 shadow-[0_0_70px_rgba(35,190,220,0.12)]">
        <header className="flex items-start justify-between gap-4 border-b border-cyan-300/15 px-4 py-4 sm:px-6">
          <div>
            <div className="mb-1 flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-teal-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> M27 // FLIGHT SYSTEMS</div>
            <h2 className="text-xl font-semibold tracking-wide sm:text-2xl">Advanced Operations Console</h2>
            <p className="mt-1 font-mono text-[10px] tracking-wider text-slate-400">LUNAR OUTPOST · {fmtClock(mission.time)} · LIVE SIMULATION DATA</p>
          </div>
          <button onClick={onClose} className="flex items-center gap-2 border border-slate-600/70 px-3 py-2 font-mono text-[10px] tracking-widest text-slate-300 transition hover:border-teal-300 hover:text-white" aria-label="Close operations console"><X size={14} /> CLOSE</button>
        </header>

        <nav className="flex gap-1 border-b border-cyan-300/15 px-3 pt-2 sm:px-5" aria-label="Operations console sections">
          {([ ["telemetry", "TELEMETRY", Gauge], ["protocols", "RESPONSE PROTOCOLS", AlertTriangle], ["crew", "CREW NET", Users] ] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-[10px] tracking-widest transition sm:px-4 ${tab === id ? "border-teal-300 bg-teal-300/5 text-teal-200" : "border-transparent text-slate-500 hover:text-slate-200"}`}><Icon size={13} /> {label}</button>
          ))}
        </nav>

        <div className="overflow-y-auto p-4 sm:p-6">
          {tab === "telemetry" && <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-3 flex items-center justify-between"><h3 className="font-mono text-xs tracking-[0.2em] text-slate-300">RESOURCE TELEMETRY</h3><span className="font-mono text-[9px] text-emerald-300">● STREAM ACTIVE</span></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {RESOURCE_META.map(({ key, label, unit, icon: Icon, color, meaning }) => {
                  const value = Math.round(mission.res[key]);
                  const status = value < 25 ? "CRITICAL" : value < 50 ? "CAUTION" : "NOMINAL";
                  return <article key={key} className="border border-slate-700/70 bg-slate-900/50 p-4">
                    <div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-slate-300"><Icon size={14} style={{ color }} /> {label}</span><span className={`font-mono text-[9px] ${value < 25 ? "text-red-300" : value < 50 ? "text-amber-300" : "text-emerald-300"}`}>{status}</span></div>
                    <div className="flex items-end gap-1"><span className="text-3xl font-semibold tabular-nums" style={{ color }}>{value}</span><span className="mb-1 font-mono text-xs text-slate-500">{unit}</span></div>
                    <div className="my-3 h-1.5 overflow-hidden bg-slate-800"><div className="h-full transition-all duration-500" style={{ width: `${value}%`, background: color }} /></div>
                    <p className="text-xs text-slate-400">{meaning}</p>
                  </article>;
                })}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Values are the game’s simulated resource reserves, not real spacecraft telemetry.</p>
            </div>
            <div className="space-y-4">
              <article className="border border-slate-700/70 bg-slate-900/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 font-mono text-xs tracking-widest text-slate-300"><Radio size={14} className="text-teal-300" /> MISSION HEALTH</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="CREW STABILITY" value={`${Math.round(mission.crewStability)}%`} />
                  <Metric label="MISSION XP" value={`${mission.xp}`} />
                  <Metric label="OBJECTIVES" value={`${mission.done.length}`} />
                  <Metric label="SAMPLES" value={`${mission.samples}`} />
                  <Metric label="SCIENCE" value={`${Math.round(mission.science)}`} />
                  <Metric label="EMERGENCIES" value={`${mission.handled}`} />
                </div>
              </article>
              <article className={`border p-4 ${mission.emergency ? "border-red-400/50 bg-red-950/20" : "border-emerald-400/25 bg-emerald-950/10"}`}>
                <h3 className="mb-2 flex items-center gap-2 font-mono text-xs tracking-widest"><span className={`h-2 w-2 rounded-full ${mission.emergency ? "animate-pulse bg-red-400" : "bg-emerald-400"}`} /> CURRENT ALERT</h3>
                {mission.emergency ? <><p className="font-semibold text-red-200">{mission.emergency.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-300">{mission.emergency.hint}</p><p className="mt-3 font-mono text-[10px] text-red-200">RESPONSE REQUIRED · {mission.emergency.station.toUpperCase()}</p></> : <p className="text-sm text-emerald-200">No active emergency. Continue routine systems checks.</p>}
              </article>
              <article className="border border-slate-700/70 bg-slate-900/50 p-4">
                <h3 className="mb-3 font-mono text-xs tracking-widest text-slate-300">RECENT EVENT LOG</h3>
                {recent.length ? <div className="space-y-3">{recent.map((event) => <div key={event.id} className="border-l border-teal-300/40 pl-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{event.title}</span><span className="font-mono text-[9px] text-slate-500">{fmtClock(event.at)}</span></div><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{event.consequence}</p></div>)}</div> : <p className="text-xs text-slate-500">No logged events yet. Mission events will appear here.</p>}
              </article>
            </div>
          </div>}

          {tab === "protocols" && <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <div><h3 className="mb-3 font-mono text-xs tracking-[0.2em] text-slate-300">EMERGENCY INDEX</h3><div className="space-y-1">{PROTOCOLS.map((p, i) => <button key={p.code} onClick={() => setProtocol(i)} className={`w-full border px-3 py-3 text-left transition ${protocol === i ? "border-teal-300/50 bg-teal-300/10 text-teal-100" : "border-slate-700/60 bg-slate-900/30 text-slate-400 hover:border-slate-500 hover:text-white"}`}><span className="block font-mono text-[9px] tracking-widest text-slate-500">{p.code}</span><span className="mt-1 block text-sm">{p.title}</span></button>)}</div></div>
            <article className="border border-slate-700/70 bg-slate-900/40 p-4 sm:p-6"><div className="mb-4 flex items-start gap-3"><div className="border border-amber-300/30 bg-amber-300/10 p-3 text-amber-200"><AlertTriangle size={20} /></div><div><span className="font-mono text-[10px] tracking-widest text-amber-200">STANDARD RESPONSE CARD · {activeProtocol.code}</span><h3 className="mt-1 text-xl font-semibold">{activeProtocol.title}</h3><p className="mt-1 text-xs text-slate-400">Educational response guidance. Follow in-game instructions and reassess after each action.</p></div></div><ol className="space-y-3">{activeProtocol.steps.map((step, i) => <li key={step} className="flex gap-3 border-t border-slate-700/50 pt-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center border border-teal-300/30 font-mono text-xs text-teal-200">0{i + 1}</span><p className="pt-1 text-sm leading-relaxed text-slate-300">{step}</p></li>)}</ol><div className="mt-5 border border-slate-700/60 bg-black/20 p-3 font-mono text-[10px] leading-relaxed text-slate-500">PROTOCOL NOTE // Prioritize crew safety and life support. A fast action is not always a safe action; verify the system state after intervention.</div></article>
          </div>}

          {tab === "crew" && <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-mono text-xs tracking-[0.2em] text-slate-300">CREW NET // HUMAN FACTORS</h3><p className="mt-1 text-xs text-slate-500">Crew roles and operational priorities for the current mission.</p></div><span className="font-mono text-[10px] text-teal-200">STABILITY {Math.round(mission.crewStability)}%</span></div>
            <div className="grid gap-3 md:grid-cols-2">
              {CREW.map((member, i) => {
                const details = ["Protects power, habitat integrity and equipment reliability.", "Maintains science objectives while monitoring experiment quality.", "Prioritizes atmosphere, water recovery and crew life-support margins.", "Coordinates decisions, mission objectives and crew safety." ];
                const priorities = ["HARDWARE & POWER", "SCIENCE OBJECTIVES", "CREW LIFE SUPPORT", "MISSION COORDINATION"];
                return <article key={member.id} className="border border-slate-700/70 bg-slate-900/45 p-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center border text-lg font-semibold" style={{ borderColor: `${member.accent}70`, background: `${member.accent}15`, color: member.accent }}>{member.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{member.name}</h4><span className="font-mono text-[9px] tracking-widest" style={{ color: member.accent }}>● ON DUTY</span></div><p className="text-xs text-slate-400">{member.role}</p></div></div><div className="mt-4 border-t border-slate-700/50 pt-3"><p className="font-mono text-[9px] tracking-widest text-slate-500">PRIMARY PRIORITY // {priorities[i]}</p><p className="mt-2 text-sm leading-relaxed text-slate-300">{details[i]}</p></div></article>;
              })}
            </div>
            <div className="mt-4 flex items-start gap-3 border border-violet-300/20 bg-violet-300/5 p-4"><Users size={16} className="mt-0.5 shrink-0 text-violet-200" /><div><p className="text-sm font-medium text-violet-100">Commander’s decision principle</p><p className="mt-1 text-xs leading-relaxed text-slate-400">Team members may prioritize different goals. Balance equipment reliability, science value and human factors; explain the trade-off through the action you take.</p></div></div>
          </div>}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-cyan-300/15 px-4 py-3 font-mono text-[9px] tracking-widest text-slate-500 sm:px-6"><span>M27-EXPLORER // OPS CONSOLE</span><span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-300" /> LOCAL SIMULATION</span></footer>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border border-slate-700/50 bg-black/20 p-3"><p className="font-mono text-[9px] tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-100">{value}</p></div>;
}
