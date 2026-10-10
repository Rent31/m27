import { create } from "zustand";
import { MIN_PER_SEC, MISSION_END_MIN, SAVE_KEY, fmtClock } from "./config";
import { BASE_RADIUS, CREW, resetWorld, world, stationById, type CrewId } from "./world";
import { audio } from "./audio";

export type Screen = "home" | "select" | "mars" | "training" | "lunar" | "report";
export type ActivityKind = "leak" | "power" | "greenhouse" | "radiation" | "eva" | "wires" | "command" | "conflict";
export type EmergencyId = "power" | "greenhouse" | "leak" | "radiation" | "cooling" | "conflict";
export type ResKey = "life" | "power" | "safety" | "food" | "water";
export type Resources = Record<ResKey, number>;

export interface Emergency { id: EmergencyId; title: string; hint: string; station: string; startedAt: number }
export interface Objective { id: string; label: string; target: string; xp: number }
export interface LogEvent { id: string; at: number; title: string; happened: string; did: string; changed: string; consequence: string; tone: "alert" | "good" }
export interface Activity { kind: ActivityKind; context: "training" | "mission" }
export interface Dialogue { name: string; role: string; lines: string[]; idx: number; accent: string }

export interface Mission {
  time: number;
  res: Resources;
  xp: number;
  done: string[];
  emergency: Emergency | null;
  fired: string[];
  handled: number;
  log: LogEvent[];
  science: number;
  exploration: number;
  crewStability: number;
  samples: number;
  evaReady: boolean;
  inRover: boolean;
  badges: string[];
  playerPos: [number, number];
  shelterUntil: number;
  powerMode: "balanced" | "greenhouse" | "science" | "life";
  commsFixed: boolean;
  outcome?: { success: boolean; reason: string };
}

export const OBJECTIVES: Objective[] = [
  { id: "talk-ari", label: "Talk to Commander Ari", target: "ari", xp: 20 },
  { id: "check-power", label: "Check the Power Station", target: "power", xp: 25 },
  { id: "inspect-gh", label: "Inspect the Greenhouse", target: "greenhouse", xp: 25 },
  { id: "check-hab", label: "Check habitat pressure", target: "habitat", xp: 20 },
  { id: "prep-eva", label: "Run EVA suit checks at the Airlock", target: "airlock", xp: 40 },
  { id: "sample1", label: "Collect a basalt sample (east)", target: "rock1", xp: 40 },
  { id: "drive", label: "Take the rover for a drive", target: "rover", xp: 30 },
  { id: "photo", label: "Photograph Earth from Earthrise Ridge", target: "earthview", xp: 40 },
  { id: "lab", label: "Analyze samples in the Science Lab", target: "lab", xp: 50 },
  { id: "comms", label: "Repair the comms antenna", target: "comms", xp: 40 },
  { id: "sample2", label: "Collect a highland sample (west)", target: "rock2", xp: 40 },
  { id: "crater", label: "Scan the crater rim", target: "crater", xp: 50 },
  { id: "help-nova", label: "Help Nova with life support", target: "nova", xp: 25 },
  { id: "sample3", label: "Collect a breccia sample (south)", target: "rock3", xp: 40 },
  { id: "storage", label: "Organize supply storage", target: "storage", xp: 20 },
  { id: "cmd", label: "Report status from Command", target: "cmd", xp: 25 },
];

const EMERGENCIES: Record<EmergencyId, Omit<Emergency, "startedAt" | "id">> = {
  power: { title: "POWER FAILURE", hint: "Solar output dropped! Go to the Power Station and re-route power.", station: "power" },
  greenhouse: { title: "CROP STRESS", hint: "Greenhouse sensors show wilting crops. Fix water, light and nutrients.", station: "greenhouse" },
  leak: { title: "RAPID DEPRESSURIZATION", hint: "Cabin pressure falling! Read the Habitat panel and close the leaking hatch.", station: "habitat" },
  radiation: { title: "SOLAR PARTICLE EVENT", hint: "Radiation rising. Check the monitor in the Command Module.", station: "cmd" },
  conflict: { title: "CREW CONFLICT", hint: "Maya and Leo disagree about power use. Go talk to Maya.", station: "maya" },
  cooling: { title: "SUIT COOLING FAILURE", hint: "Your suit is overheating! Return to the Airlock now.", station: "airlock" },
};
const SCHEDULE: { id: EmergencyId; at: number }[] = [
  { id: "power", at: 150 },
  { id: "greenhouse", at: 420 },
  { id: "leak", at: 660 },
  { id: "radiation", at: 930 },
  { id: "conflict", at: 1180 },
];

export const BADGES = ["Life Support Pro", "Power Saver", "Radiation Ready", "Greenhouse Hero", "EVA Ready", "Systems Thinker"];

export function newMission(): Mission {
  return {
    time: 0,
    res: { life: 92, power: 80, safety: 90, food: 75, water: 80 },
    xp: 0, done: [], emergency: null, fired: [], handled: 0, log: [],
    science: 0, exploration: 0, crewStability: 80, samples: 0,
    evaReady: false, inRover: false, badges: [], playerPos: [2, 3],
    shelterUntil: 0, powerMode: "balanced", commsFixed: false,
  };
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

interface Toast { text: string; tone: "info" | "good" | "bad"; id: number }

interface GameState {
  screen: Screen;
  paused: boolean;
  handbook: boolean;
  activity: Activity | null;
  dialogue: Dialogue | null;
  prompt: { id: string; label: string } | null;
  toast: Toast | null;
  mission: Mission;
  training: Record<string, boolean>;
  custom: { name: string; accent: string };
  hasSave: boolean;

  go: (s: Screen) => void;
  setPrompt: (p: { id: string; label: string } | null) => void;
  showToast: (text: string, tone?: Toast["tone"]) => void;
  setCustom: (c: Partial<GameState["custom"]>) => void;
  startMission: () => void;
  continueMission: () => boolean;
  resetSave: () => void;
  saveGame: () => void;
  leaveToHome: () => void;
  setPaused: (p: boolean) => void;
  setHandbook: (h: boolean) => void;
  openActivity: (a: Activity | null) => void;
  finishActivity: (result: Record<string, unknown>) => void;
  nextDialogue: () => void;
  interact: (id: string) => void;
  tick: (dt: number) => void;
  completeObjective: (id: string) => void;
  addXp: (n: number) => void;
}

function persisted(s: GameState) {
  return { mission: s.mission, training: s.training, custom: s.custom };
}

let toastId = 0;

export const useGame = create<GameState>((set, get) => {
  const patchMission = (fn: (m: Mission) => Partial<Mission>) => set((s) => ({ mission: { ...s.mission, ...fn(s.mission) } }));
  const giveBadge = (b: string) => {
    const m = get().mission;
    if (m.badges.includes(b)) return;
    patchMission((mm) => ({ badges: [...mm.badges, b] }));
    get().showToast(`Badge earned: ${b}`, "good");
  };
  const log = (e: Omit<LogEvent, "id" | "at">) => patchMission((m) => ({ log: [...m.log, { ...e, id: `${m.time}-${m.log.length}`, at: m.time }] }));
  const resolveEmergency = (xp: number, entry: Omit<LogEvent, "id" | "at" | "tone">, toast: string) => {
    patchMission((m) => ({ emergency: null, handled: m.handled + 1 }));
    log({ ...entry, tone: "good" });
    get().addXp(xp);
    audio.sfx("success");
    get().showToast(toast, "good");
    if (get().mission.handled >= 4) giveBadge("Systems Thinker");
  };
  const fire = (id: EmergencyId) => {
    const def = EMERGENCIES[id];
    patchMission((m) => {
      const res = { ...m.res };
      if (id === "power") res.power = Math.min(res.power, 32);
      return { emergency: { id, ...def, startedAt: m.time }, fired: [...m.fired, id], res };
    });
    audio.sfx("alarm");
  };

  return {
    screen: "home",
    paused: false,
    handbook: false,
    activity: null,
    dialogue: null,
    prompt: null,
    toast: null,
    mission: newMission(),
    training: {},
    custom: { name: "Cadet", accent: "#ff8a3d" },
    hasSave: typeof window !== "undefined" && !!localStorage.getItem(SAVE_KEY),

    go: (screen) => { set({ screen, paused: false, activity: null, dialogue: null, prompt: null, handbook: false }); },
    setPrompt: (prompt) => set({ prompt }),
    showToast: (text, tone = "info") => set({ toast: { text, tone, id: ++toastId } }),
    setCustom: (c) => set((s) => ({ custom: { ...s.custom, ...c } })),
    startMission: () => {
      resetWorld();
      set({ mission: newMission(), screen: "lunar", paused: false, activity: null, dialogue: null, prompt: null, handbook: false });
      get().saveGame();
    },
    continueMission: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        const mission: Mission = { ...newMission(), ...data.mission, inRover: false };
        resetWorld(mission.playerPos[0], mission.playerPos[1]);
        set({ mission, training: data.training ?? {}, custom: data.custom ?? get().custom, screen: "lunar", paused: false, activity: null, dialogue: null, prompt: null });
        return true;
      } catch { return false; }
    },
    resetSave: () => { localStorage.removeItem(SAVE_KEY); set({ hasSave: false, mission: newMission(), training: {} }); },
    saveGame: () => {
      const s = get();
      const mission = { ...s.mission, playerPos: [world.player.x, world.player.z] as [number, number] };
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...persisted(s), mission }));
      set({ hasSave: true });
    },
    leaveToHome: () => { get().saveGame(); get().go("home"); },
    setPaused: (paused) => set({ paused }),
    setHandbook: (handbook) => set({ handbook }),
    openActivity: (activity) => set({ activity }),
    addXp: (n) => patchMission((m) => ({ xp: m.xp + Math.round(n) })),
    completeObjective: (id) => {
      const m = get().mission;
      if (m.done.includes(id)) return;
      const o = OBJECTIVES.find((x) => x.id === id);
      if (!o) return;
      patchMission((mm) => ({ done: [...mm.done, id], exploration: mm.exploration + 1 }));
      get().addXp(o.xp);
      get().showToast(`Objective complete: ${o.label} (+${o.xp} XP)`, "good");
    },

    nextDialogue: () => {
      const d = get().dialogue;
      if (!d) return;
      audio.sfx("click");
      if (d.idx + 1 >= d.lines.length) set({ dialogue: null });
      else set({ dialogue: { ...d, idx: d.idx + 1 } });
    },

    finishActivity: (result) => {
      const a = get().activity;
      if (!a) return;
      set({ activity: null });
      if (a.context === "training") {
        set((s) => ({ training: { ...s.training, [a.kind]: true } }));
        audio.sfx("success");
        return;
      }
      const m = get().mission;
      const elapsed = m.emergency ? m.time - m.emergency.startedAt : 0;
      switch (a.kind) {
        case "leak": {
          const slow = elapsed > 60;
          patchMission((mm) => ({ res: { ...mm.res, life: clamp(mm.res.life + 6) } }));
          get().completeObjective("check-hab");
          giveBadge("Life Support Pro");
          resolveEmergency(slow ? 40 : 80, {
            title: "Pressure Leak",
            happened: "A micro-leak opened in one habitat module and cabin pressure began to fall.",
            did: `You read the pressure gauges and sealed the leaking module${(result.wrong as number) ? ` after ${result.wrong} wrong valve(s)` : " on the first try"}.`,
            changed: "Pressure stabilized; life support recovered +6%.",
            consequence: slow ? `It took ${Math.round(elapsed)} mission minutes — the crew lost some oxygen reserve.` : "Fast response — almost no oxygen was lost.",
          }, "Pressure stabilized. Nice work!");
          break;
        }
        case "power": {
          const p = result.priority as Mission["powerMode"];
          patchMission((mm) => {
            const res = { ...mm.res, power: 72 };
            let science = mm.science;
            if (p === "greenhouse") res.food = clamp(res.food + 10);
            if (p === "science") science += 15;
            if (p === "life") { res.life = clamp(res.life + 8); res.safety = clamp(res.safety + 6); }
            return { res, science, powerMode: p };
          });
          get().completeObjective("check-power");
          giveBadge("Power Saver");
          const label = { greenhouse: "the greenhouse", science: "science", life: "life support", balanced: "a balanced load" }[p];
          resolveEmergency(70, {
            title: "Power Failure",
            happened: "Lunar dust on the arrays cut solar generation sharply.",
            did: `You kept life support online and prioritized ${label}.`,
            changed: "Power restored to 72% with a new load plan.",
            consequence: p === "greenhouse" ? "Crops kept growing: +10 food." : p === "science" ? "Experiments kept running: +15 science." : "Crew stayed comfortable and safe: +8 life support.",
          }, "Power re-routed!");
          break;
        }
        case "greenhouse": {
          patchMission((mm) => ({ res: { ...mm.res, food: clamp(mm.res.food + 12), water: clamp(mm.res.water - 4) } }));
          get().completeObjective("inspect-gh");
          giveBadge("Greenhouse Hero");
          resolveEmergency(70, {
            title: "Greenhouse Problem",
            happened: "Crops started wilting — water, light and nutrients drifted out of balance.",
            did: "You tuned water flow, LED lighting and nutrient mix until plants recovered.",
            changed: "Food +12, water −4 (plants drink!).",
            consequence: "Healthy crops mean the crew relies less on packed food from Earth.",
          }, "Crops are recovering!");
          break;
        }
        case "radiation": {
          const safe = result.choice === "safety";
          patchMission((mm) => ({
            shelterUntil: mm.time + 120,
            science: mm.science + (safe ? 0 : 25),
            res: { ...mm.res, safety: clamp(mm.res.safety + (safe ? 12 : -18)) },
          }));
          giveBadge("Radiation Ready");
          resolveEmergency(safe ? 80 : 55, {
            title: "Radiation Alert",
            happened: "A solar flare sent energetic particles toward the Moon.",
            did: safe ? "You moved all crew into the shielded shelter and secured equipment." : "You sheltered most crew but kept science running during the window.",
            changed: safe ? "Safety +12. Science paused for 2 hours." : "Science +25, but safety −18 from extra exposure.",
            consequence: safe ? "Zero crew exposure — a textbook response." : "Valuable data, but the crew absorbed extra radiation dose.",
          }, safe ? "Crew is safe in the shelter." : "Science continues — crew dose increased.");
          break;
        }
        case "conflict": {
          const c = result.choice as string;
          const delta = c === "listen" ? 20 : c === "rotate" ? 14 : -10;
          patchMission((mm) => ({ crewStability: clamp(mm.crewStability + delta) }));
          resolveEmergency(c === "side" ? 25 : 60, {
            title: "Crew Conflict",
            happened: "Maya wanted power for repairs, Leo wanted it for experiments.",
            did: c === "listen" ? "You listened to both and found a shared schedule." : c === "rotate" ? "You set up a rotating power schedule." : "You picked one side.",
            changed: `Crew stability ${delta > 0 ? "+" : ""}${delta}.`,
            consequence: c === "side" ? "One crew member feels ignored — teamwork suffers." : "The team trusts your leadership.",
          }, "The crew is working together again.");
          break;
        }
        case "eva": {
          patchMission(() => ({ evaReady: true }));
          get().completeObjective("prep-eva");
          giveBadge("EVA Ready");
          audio.sfx("success");
          get().showToast("Suit ready! You can now leave the base perimeter.", "good");
          break;
        }
        case "wires": {
          patchMission(() => ({ commsFixed: true }));
          get().completeObjective("comms");
          audio.sfx("success");
          log({ title: "Comms Restored", happened: "The antenna feed was disconnected.", did: "You reconnected the wiring harness.", changed: "Link to Earth restored.", consequence: "Mission Control can send you data again.", tone: "good" });
          break;
        }
        default: break;
      }
    },

    interact: (id) => {
      const s = get();
      const m = s.mission;
      audio.sfx("click");
      const em = m.emergency;

      if (id === "rover") {
        if (m.inRover) {
          patchMission(() => ({ inRover: false }));
          world.player.set(world.rover.pos.x + Math.cos(world.rover.yaw) * 2.4, 0, world.rover.pos.z - Math.sin(world.rover.yaw) * 2.4);
          s.showToast("You hop out of the rover.");
        } else {
          patchMission(() => ({ inRover: true }));
          s.completeObjective("drive");
          s.showToast(m.evaReady ? "Rover online. W/S to drive, A/D to steer, ENTER to exit." : "Rover online. Run suit checks at the Airlock before leaving the base.");
        }
        return;
      }

      // Emergency at this station?
      if (em && em.station === id) {
        if (em.id === "cooling") {
          const elapsed = m.time - em.startedAt;
          patchMission((mm) => ({ res: { ...mm.res, safety: clamp(mm.res.safety + 4) } }));
          resolveEmergency(elapsed < 40 ? 70 : 35, {
            title: "EVA Cooling Failure",
            happened: "Your suit's water cooling loop started failing during EVA.",
            did: `You headed straight back to the airlock (${Math.round(elapsed)} mission min).`,
            changed: "Suit cooling serviced; safety recovered slightly.",
            consequence: elapsed < 40 ? "Quick return — no heat injury." : "A slow return caused heat stress.",
          }, "Back inside. Suit cooling repaired.");
          return;
        }
        if (em.id === "conflict") { set({ activity: { kind: "conflict", context: "mission" } }); return; }
        const kind: ActivityKind = em.id === "leak" ? "leak" : em.id === "power" ? "power" : em.id === "greenhouse" ? "greenhouse" : "radiation";
        set({ activity: { kind, context: "mission" } });
        return;
      }

      const crew = CREW.find((c) => c.id === id);
      if (crew) {
        if (id === "ari") s.completeObjective("talk-ari");
        if (id === "nova") s.completeObjective("help-nova");
        set({ dialogue: { name: crew.name, role: crew.role, accent: crew.accent, idx: 0, lines: crewLines(crew.id, get().mission) } });
        return;
      }

      const r = m.res;
      switch (id) {
        case "power":
          s.completeObjective("check-power");
          s.showToast(`Solar ${Math.round(r.power)}% · Battery ${Math.round(r.power * 0.9)}% · Load ${m.powerMode}. Systems nominal.`);
          break;
        case "greenhouse":
          s.completeObjective("inspect-gh");
          s.showToast(`Crops growing. Food ${Math.round(r.food)}% · Water ${Math.round(r.water)}%. Lettuce looks happy!`);
          break;
        case "habitat":
          s.completeObjective("check-hab");
          s.showToast("All modules holding 101.3 kPa. Seals look good.");
          break;
        case "airlock":
          if (m.evaReady) s.showToast("Suit is ready. Head out past the perimeter markers to explore.");
          else set({ activity: { kind: "eva", context: "mission" } });
          break;
        case "lab":
          if (m.samples > 0) {
            patchMission((mm) => ({ science: mm.science + mm.samples * 12, samples: 0 }));
            s.completeObjective("lab");
            audio.sfx("success");
            s.showToast(`Samples analyzed! +${m.samples * 12} science.`, "good");
          } else s.showToast("No samples to analyze. Collect lunar rocks on EVA first.");
          break;
        case "comms":
          if (m.commsFixed) s.showToast("Antenna is tracking Earth. Signal strong.");
          else set({ activity: { kind: "wires", context: "mission" } });
          break;
        case "storage":
          s.completeObjective("storage");
          patchMission((mm) => ({ res: { ...mm.res, food: clamp(mm.res.food + 3) } }));
          s.showToast("Supplies organized. Found extra food packs (+3 food).", "good");
          break;
        case "cmd":
          s.completeObjective("cmd");
          s.showToast(`Status sent to Earth: Life ${Math.round(r.life)}% · Power ${Math.round(r.power)}% · Safety ${Math.round(r.safety)}% · Food ${Math.round(r.food)}%`);
          break;
        case "rock1": case "rock2": case "rock3": {
          const oid = id === "rock1" ? "sample1" : id === "rock2" ? "sample2" : "sample3";
          if (m.done.includes(oid)) { s.showToast("Already sampled. Try another site."); break; }
          patchMission((mm) => ({ samples: mm.samples + 1, science: mm.science + 5 }));
          audio.sfx("collect");
          s.completeObjective(oid);
          break;
        }
        case "crater":
          patchMission((mm) => ({ science: mm.science + 15 }));
          audio.sfx("beep");
          s.completeObjective("crater");
          s.showToast("Crater scanned: impact ejecta mapped (+15 science).", "good");
          break;
        case "earthview":
          audio.sfx("photo");
          patchMission((mm) => ({ crewStability: clamp(mm.crewStability + 6) }));
          s.completeObjective("photo");
          s.showToast("Click! The crew loves the Earthrise photo (+6 crew morale).", "good");
          break;
      }
    },

    tick: (dt) => {
      const s = get();
      if (s.screen !== "lunar" || s.paused || s.activity || s.dialogue || s.handbook) return;
      const m = s.mission;
      const dm = dt * MIN_PER_SEC;
      const time = m.time + dm;
      const res = { ...m.res };
      const em = m.emergency?.id;
      const greenhouseLit = res.power > 30 && em !== "power";
      res.life -= dm * (m.powerMode === "life" ? 0.003 : 0.006);
      res.water -= dm * 0.005;
      res.food -= dm * 0.009;
      res.power += dm * (em === "power" ? -0.05 : 0.006);
      if (greenhouseLit && res.water > 15) res.food += dm * (m.powerMode === "greenhouse" ? 0.012 : 0.008);
      res.water += dm * 0.003; // recycling
      res.safety += dm * 0.004;
      let science = m.science + (m.powerMode === "science" && time > m.shelterUntil ? dm * 0.02 : 0);
      if (em === "leak") { res.life -= dm * 0.09; res.safety -= dm * 0.03; res.power -= dm * 0.01; }
      if (em === "radiation") res.safety -= dm * 0.07;
      if (em === "greenhouse") res.food -= dm * 0.05;
      if (em === "cooling") res.safety -= dm * 0.12;
      let crewStability = m.crewStability;
      if (em === "conflict") crewStability -= dm * 0.04;
      (Object.keys(res) as ResKey[]).forEach((k) => (res[k] = clamp(res[k])));
      if (time >= m.shelterUntil) science += 0;
      set({ mission: { ...m, time, res, science, crewStability: clamp(crewStability) } });

      if (!m.emergency) {
        const next = SCHEDULE.find((e) => time >= e.at && !m.fired.includes(e.id));
        if (next) fire(next.id);
        else if (!m.fired.includes("cooling") && time > 300 && !m.inRover && Math.hypot(world.player.x, world.player.z) > BASE_RADIUS + 8) fire("cooling");
      }
      const failKey = res.life <= 0 ? "life" : res.safety <= 0 ? "safety" : res.food <= 0 ? "food" : null;
      if (failKey) {
        localStorage.removeItem(SAVE_KEY);
        const why = {
          life: "Life support reserves ran out — the habitat could no longer keep the crew breathing safely.",
          safety: "Crew safety margin reached zero — accumulated hazards (radiation, heat or pressure) forced an evacuation.",
          food: "Food reserves were exhausted before resupply.",
        }[failKey];
        const cause = m.emergency ? ` The unresolved ${m.emergency.title.toLowerCase()} drained reserves fastest.` : "";
        log({ title: "Mission Aborted", happened: why + cause, did: "Mission Control ordered the crew to return to Earth.", changed: "Outpost placed in safe mode.", consequence: "Respond to alerts sooner and keep reserves above 30%.", tone: "alert" });
        set((st) => ({ mission: { ...st.mission, outcome: { success: false, reason: why + cause } }, screen: "report", hasSave: false, prompt: null }));
        return;
      }
      if (time >= MISSION_END_MIN) {
        localStorage.removeItem(SAVE_KEY);
        log({ title: "Mission Complete", happened: `The outpost reached ${fmtClock(MISSION_END_MIN)}.`, did: "You kept the base running for 27 mission hours.", changed: "Mission handed over to the next crew.", consequence: "Well done, Commander.", tone: "good" });
        set((st) => ({ mission: { ...st.mission, outcome: { success: true, reason: "The outpost stayed operational for all 27 mission hours." } }, screen: "report", hasSave: false, prompt: null }));
      }
    },
  };
});

function crewLines(id: CrewId, m: Mission): string[] {
  const r = m.res;
  const em = m.emergency;
  if (em) {
    const where = stationById[em.station]?.name ?? "the right spot";
    return [`We've got a ${em.title.toLowerCase()}!`, `${em.hint}`, `Head to ${where} — I'll keep things steady here.`];
  }
  switch (id) {
    case "maya":
      if (r.power < 50) return ["Power generation is dropping.", "You might want to check the solar array at the Power Station."];
      if (!m.commsFixed) return ["The comms antenna lost its feed cable.", "Mind reconnecting the wiring? It's on the west side of base."];
      return ["Systems look green.", "Fun fact: a lunar night lasts about 14 Earth days — batteries matter!"];
    case "leo":
      if (m.samples > 0) return ["You've got samples? Amazing!", "Bring them to the Science Lab and we'll analyze them."];
      if (!m.evaReady) return ["I'd love some rock samples.", "Run your suit checks at the Airlock, then head out past the markers."];
      return ["The dark areas you see from Earth are basalt — old lava plains.", "The bright highlands are anorthosite. Can you sample both?"];
    case "nova":
      if (r.life < 60) return ["Life support is working hard.", "Keep an eye on the pressure panel in the Habitat."];
      return ["Our scrubbers pull CO₂ out of the air, and we recycle most of our water.", "Every drop counts up here!"];
    case "ari":
      return [
        `Welcome to the outpost, Commander. We've got 27 mission hours.`,
        "Keep Life Support, Power, Safety and Food healthy. Objectives are on the left.",
        "When an alarm sounds, follow the red marker. Good luck!",
      ];
  }
}
