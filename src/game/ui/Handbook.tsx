import { useState } from "react";
import { GameButton } from "./Button";

const SECTIONS = [
  { id: "life", icon: "🫁", title: "Life Support", color: "var(--secondary)", cards: [
    ["Air pressure", "Habitats keep air near 101 kPa — the same as sea level on Earth."],
    ["CO₂ scrubbers", "Every breath adds carbon dioxide. Scrubbers pull it out so air stays safe."],
    ["Leaks", "Close the hatch of a leaking module to protect the rest of the base."],
  ] },
  { id: "power", icon: "⚡", title: "Power", color: "var(--warning)", cards: [
    ["Solar first", "Solar panels make power during the lunar day. Dust on panels lowers output."],
    ["Long nights", "A lunar night lasts about 14 Earth days. Batteries and planning are vital."],
    ["Priorities", "Life support is never switched off. Then decide: food, science, or comfort."],
  ] },
  { id: "rad", icon: "☢", title: "Radiation", color: "var(--destructive)", cards: [
    ["No shield", "The Moon has no thick atmosphere or global magnetic field to block radiation."],
    ["Solar events", "Solar flares can send bursts of particles. Crew head to a shielded shelter."],
    ["Shielding", "Water, regolith and dense materials absorb radiation well."],
  ] },
  { id: "food", icon: "🥬", title: "Food", color: "var(--success)", cards: [
    ["Grow it", "Lunar greenhouses use LED light, recycled water and measured nutrients."],
    ["Balance", "Too much or too little water, light or nutrients and crops struggle."],
    ["Fresh = happy", "Fresh food boosts crew morale on long missions."],
  ] },
  { id: "moon", icon: "🌙", title: "The Moon", color: "var(--muted-foreground)", cards: [
    ["Gravity", "Moon gravity is about 1/6 of Earth's — that's why astronauts hop!"],
    ["Temperature", "Surface temps swing from about −173 °C at night to 127 °C in sunlight."],
    ["Rocks", "Dark maria are basalt lava plains. Bright highlands are anorthosite."],
  ] },
  { id: "eva", icon: "🧑‍🚀", title: "EVA", color: "var(--primary)", cards: [
    ["Personal spacecraft", "A spacesuit supplies oxygen, pressure, cooling and power."],
    ["Cooling", "Suits use a water cooling loop. If it fails, return to the airlock fast."],
    ["Check first", "Always test oxygen, cooling and battery before stepping outside."],
  ] },
];

export function Handbook({ onClose }: { onClose: () => void }) {
  const [sel, setSel] = useState(SECTIONS[0].id);
  const s = SECTIONS.find((x) => x.id === sel)!;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="panel flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest text-muted-foreground">ASTRONAUT HANDBOOK</p>
            <h2 className="text-3xl font-bold">Field Notes</h2>
          </div>
          <GameButton variant="ghost" onClick={onClose}>Close</GameButton>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {SECTIONS.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`rounded-full border px-3 py-1.5 font-display text-sm transition ${sel === x.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:bg-accent"}`}>
              {x.icon} {x.title}
            </button>
          ))}
        </div>
        <div className="grid gap-3 overflow-y-auto sm:grid-cols-3">
          {s.cards.map(([t, d], i) => (
            <div key={t} className="rounded-2xl border border-border bg-muted/60 p-4" style={{ borderTop: `4px solid ${s.color}`, transform: `rotate(${(i - 1) * 0.6}deg)` }}>
              <div className="mb-2 text-3xl">{s.icon}</div>
              <h3 className="mb-1 text-lg font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
