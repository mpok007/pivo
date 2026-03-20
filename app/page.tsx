"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Stats = {
  beer_small: number;
  beer_large: number;
  na_small: number;
  na_large: number;
};

const EMPTY_STATS: Stats = {
  beer_small: 0,
  beer_large: 0,
  na_small: 0,
  na_large: 0,
};

const BEER_MILESTONES: string[] = [
  "Testuješ kvalitu, nebo jen vytrvalost? 🧐",
  "Ty to bereš zodpovědně, aby pivo nezteplalo, viď? 🌡️",
  "Ty máš dneska permanentku na výčep? 🎫",
  "Klid, nech něco i pro ostatní, hrdino! 🦸",
  "Ty už si zasloužíš věrnostní kartu s fotkou. 📸",
  "Ty nepiješ na žízeň, Ty to máš jako životní styl. 😎",
  "Ty už to pivo nepiješ, Ty ho likviduješ! 💥",
  "Kámo, ty jsi důvod, proč zdražuje pivo! 💰",
  "Cože už 18.? To už pojedeme podle sudů ne? 🛢️",
  "Jestli dáš ještě jedno, tak snad umřeš! ☠️",
];

const NA_MILESTONES: string[] = [
  "To máš pivo, nebo jen ochucenou výmluvu? 🤔",
  "Kámo, tohle je pivo na zkoušku? 📝",
  "To už si rovnou dej vodu a nehraj si na hrdinu. 💧",
  "Nealko pivo – když chceš pít, ale zároveň nechceš pít. 🤷",
  "To je jak kafe bez kofeinu… proč vůbec? ☕",
  "To piješ dobrovolně, nebo jsi něco provedl? 👮",
  "Nealko? Takže jen simulace zábavy? 🎭",
  "Ty sis dal pivo, co nedokončilo školu! 🎓",
];

const GLASS_STROKE = "rgba(180,180,180,0.9)";

// ─── Výpočet stavu sklenice z počtu ───────────────────────────────────────────
// Vrátí: kolik sklenic je plných (waiting) a jak moc je naplněna ta aktuální
function glassStateFromCount(count: number): { fillPct: number; waiting: boolean } {
  if (count === 0) return { fillPct: 0, waiting: false };
  const posInCycle = count % 5;
  if (posInCycle === 0) {
    // Právě na 5. – sklenice plná, čeká nová
    return { fillPct: 1.0, waiting: true };
  }
  return { fillPct: posInCycle / 5 * 0.92, waiting: false };
}

// ─── SVG builders ─────────────────────────────────────────────────────────────

function buildMugSVG(id: string, fillPct: number): string {
  const w = 36, h = 44;
  const glassL = 2, glassR = w - 8, glassT = 3, glassB = h - 2;
  const innerL = glassL + 2, innerR = glassR - 2;
  const innerT = glassT + 2, innerB = glassB - 2;
  const innerH = innerB - innerT;
  const liquidH = innerH * fillPct, liquidT = innerB - liquidH;
  const foamH = fillPct > 0.05 ? Math.min(7, liquidH * 0.25) : 0;
  const beerT = liquidT + foamH;
  const foam = "#FEF3C7", beer = "#D97706";

  let html = `<defs><clipPath id="clip-${id}"><rect x="${innerL}" y="${innerT}" width="${innerR - innerL}" height="${innerH}"/></clipPath></defs>`;

  if (fillPct > 0.02) {
    html += `<rect x="${innerL}" y="${beerT}" width="${innerR - innerL}" height="${innerB - beerT}" fill="${beer}" clip-path="url(#clip-${id})"/>`;
    if (fillPct > 0.15) {
      [[0.25, 0.7, 1.2], [0.55, 0.5, 0.8], [0.4, 0.82, 0.8]].forEach(([rx, ry, rr]) => {
        html += `<circle cx="${innerL + (innerR - innerL) * rx}" cy="${beerT + (innerB - beerT) * ry}" r="${rr}" fill="rgba(255,255,255,0.5)" clip-path="url(#clip-${id})"/>`;
      });
    }
    if (foamH > 0) {
      const fw = innerR - innerL;
      let fp = `M ${innerL} ${liquidT + foamH}`;
      for (let i = 0; i <= 6; i++) {
        const bx = innerL + fw * i / 6;
        const by = liquidT + foamH * 0.3 + (i % 2 === 0 ? -foamH * 0.6 : foamH * 0.15);
        fp += ` Q ${bx - fw / 12} ${liquidT - foamH * 0.1} ${bx} ${by}`;
      }
      fp += ` L ${innerR} ${liquidT + foamH} Z`;
      html += `<path d="${fp}" fill="${foam}" clip-path="url(#clip-${id})"/>`;
      for (let i = 0; i < 3; i++)
        html += `<circle cx="${innerL + fw * (0.18 + i * 0.3)}" cy="${liquidT + foamH * 0.4}" r="1.5" fill="rgba(255,255,255,0.8)" clip-path="url(#clip-${id})"/>`;
    }
  }

  html += `<rect x="${glassL}" y="${glassT}" width="${glassR - glassL}" height="${glassB - glassT}" rx="3" fill="none" stroke="${GLASS_STROKE}" stroke-width="1.5"/>`;
  html += `<path d="M ${glassR - 1} ${glassT + 7} C ${w + 1} ${glassT + 7} ${w + 1} ${glassB - 9} ${glassR - 1} ${glassB - 9}" fill="none" stroke="${GLASS_STROKE}" stroke-width="2"/>`;
  html += `<line x1="${glassL + 4}" y1="${glassT + 4}" x2="${glassL + 2}" y2="${glassB - 6}" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>`;
  return html;
}

function buildStemSVG(id: string, fillPct: number): string {
  const w = 30, h = 44;
  const bowlTL = 2, bowlTR = w - 2, bowlBL = 9, bowlBR = w - 9, bowlT = 2, bowlB = 28;
  const innerTL = bowlTL + 2, innerTR = bowlTR - 2, innerBL = bowlBL + 1, innerBR = bowlBR - 1;
  const innerT = bowlT + 2, innerB = bowlB - 1, innerH = innerB - innerT;
  const liquidH = innerH * fillPct, liquidT = innerB - liquidH;
  const foamH = fillPct > 0.05 ? Math.min(6, liquidH * 0.25) : 0, beerT = liquidT + foamH;
  const foam = "#FEF3C7", beer = "#D97706";
  const clipPts = `${innerTL},${innerT} ${innerTR},${innerT} ${innerBR},${innerB} ${innerBL},${innerB}`;
  const totalH = bowlB - bowlT;

  function xAtY(y: number, isLeft: boolean) {
    const t = (y - bowlT) / totalH;
    return isLeft ? bowlTL + (bowlBL - bowlTL) * t + 2 : bowlTR + (bowlBR - bowlTR) * t - 2;
  }

  let html = `<defs><clipPath id="clip-${id}"><polygon points="${clipPts}"/></clipPath></defs>`;

  if (fillPct > 0.02) {
    const bTL = xAtY(beerT, true), bTR = xAtY(beerT, false);
    html += `<polygon points="${bTL},${beerT} ${bTR},${beerT} ${innerBR},${innerB} ${innerBL},${innerB}" fill="${beer}" clip-path="url(#clip-${id})"/>`;
    if (fillPct > 0.15) {
      [[0.3, 0.65, 1.0], [0.6, 0.5, 0.8], [0.45, 0.8, 0.8]].forEach(([rx, ry, rr]) => {
        html += `<circle cx="${innerBL + (innerBR - innerBL) * rx}" cy="${beerT + (innerB - beerT) * ry}" r="${rr}" fill="rgba(255,255,255,0.5)" clip-path="url(#clip-${id})"/>`;
      });
    }
    if (foamH > 0) {
      const fTL = xAtY(liquidT, true), fTR = xAtY(liquidT, false), fw = fTR - fTL;
      let fp = `M ${fTL} ${liquidT + foamH}`;
      for (let i = 0; i <= 6; i++) {
        const bx = fTL + fw * i / 6;
        const by = liquidT + foamH * 0.3 + (i % 2 === 0 ? -foamH * 0.6 : foamH * 0.15);
        fp += ` Q ${bx - fw / 12} ${liquidT - foamH * 0.1} ${bx} ${by}`;
      }
      fp += ` L ${fTR} ${liquidT + foamH} Z`;
      html += `<path d="${fp}" fill="${foam}" clip-path="url(#clip-${id})"/>`;
      for (let i = 0; i < 3; i++)
        html += `<circle cx="${fTL + fw * (0.15 + i * 0.32)}" cy="${liquidT + foamH * 0.4}" r="1.2" fill="rgba(255,255,255,0.8)" clip-path="url(#clip-${id})"/>`;
    }
  }

  html += `<polygon points="${bowlTL},${bowlT} ${bowlTR},${bowlT} ${bowlBR},${bowlB} ${bowlBL},${bowlB}" fill="none" stroke="${GLASS_STROKE}" stroke-width="1.5"/>`;
  const stemX = w / 2;
  html += `<line x1="${stemX}" y1="${bowlB}" x2="${stemX}" y2="${h - 4}" stroke="${GLASS_STROKE}" stroke-width="2.5" stroke-linecap="round"/>`;
  html += `<ellipse cx="${stemX}" cy="${h - 4}" rx="7" ry="2" fill="none" stroke="${GLASS_STROKE}" stroke-width="1.5"/>`;
  html += `<line x1="${bowlTL + 4}" y1="${bowlT + 3}" x2="${bowlBL + 2}" y2="${bowlB - 4}" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>`;
  return html;
}

// ─── Komponenta sklenice ──────────────────────────────────────────────────────

type GlassType = "mug" | "stem";

function GlassButton({
  id, type, color, label, sublabel, initialCount, onAdd,
}: {
  id: string; type: GlassType; color: string;
  label: string; sublabel: string;
  initialCount: number;  // ← počet načtený z DB při startu
  onAdd: () => void;
}) {
  const initial = glassStateFromCount(initialCount);

  const [fillPct, setFillPct] = useState(initial.fillPct);
  const [waiting, setWaiting] = useState(initial.waiting);
  const [newVisible, setNewVisible] = useState(initial.waiting); // prázdná vedle, pokud čeká
  const [newFill] = useState(0);
  const countRef = useRef(initialCount);
  const rafRef = useRef<number | null>(null);
  const fillRef = useRef(initial.fillPct);

  // Pokud se initialCount změní (po načtení z DB), synchronizujeme stav
  const prevInitialRef = useRef(initialCount);
  useEffect(() => {
    if (prevInitialRef.current === initialCount) return;
    prevInitialRef.current = initialCount;
    const s = glassStateFromCount(initialCount);
    setFillPct(s.fillPct);
    setWaiting(s.waiting);
    setNewVisible(s.waiting);
    fillRef.current = s.fillPct;
    countRef.current = initialCount;
  }, [initialCount]);

  const svgW = type === "mug" ? 36 : 30;
  const svgH = 44;
  const buildSVG = type === "mug" ? buildMugSVG : buildStemSVG;
  const idA = `${id}-a`, idB = `${id}-b`;

  function animate(from: number, to: number, setter: (v: number) => void, onDone?: () => void) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const dur = 600, start = performance.now();
    function step(now: number) {
      const t = Math.min((now - start) / dur, 1);
      setter(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else onDone?.();
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function handleClick() {
    onAdd();
    countRef.current += 1;
    const posInCycle = countRef.current % 5;

    if (waiting) {
      setWaiting(false); setNewVisible(false); setFillPct(0);
      fillRef.current = 0; countRef.current = 1;
      const toPct = 1 / 5 * 0.92;
      setTimeout(() => animate(0, toPct, (v) => { setFillPct(v); fillRef.current = v; }), 50);
      return;
    }

    if (posInCycle === 0) {
      animate(fillRef.current, 1.0, (v) => { setFillPct(v); fillRef.current = v; }, () => {
        setWaiting(true); setNewVisible(true);
      });
    } else {
      const toPct = posInCycle / 5 * 0.92;
      animate(fillRef.current, toPct, (v) => { setFillPct(v); fillRef.current = v; });
    }
  }

  return (
    <button onClick={handleClick} style={{
      border: `2px solid ${color}`, borderRadius: 14, padding: "12px 10px 10px",
      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
      gap: 4, background: "transparent", color, flex: 1, transition: "transform 0.1s ease",
    }}>
      <div style={{ height: 46, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
          dangerouslySetInnerHTML={{ __html: buildSVG(idA, waiting ? 1.0 : fillPct) }} />
        {newVisible && (
          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ animation: "fadeInGlass 0.4s ease" }}
            dangerouslySetInnerHTML={{ __html: buildSVG(idB, newFill) }} />
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 10, opacity: 0.6 }}>{sublabel}</span>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderTallies(count: number, symbol: string) {
  const groups = Math.floor(count / 5), rest = count % 5;
  return (<>{"卌".repeat(groups)}{symbol.repeat(rest)}</>);
}

function StatRow({ leftLabel, leftValue, leftSymbol, rightLabel, rightValue, rightSymbol }: {
  leftLabel: string; leftValue: number; leftSymbol: string;
  rightLabel: string; rightValue: number; rightSymbol: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {[{ label: leftLabel, value: leftValue, symbol: leftSymbol },
        { label: rightLabel, value: rightValue, symbol: rightSymbol }].map(({ label, value, symbol }) => (
        <div key={label} style={{
          background: "var(--color-background-secondary)", borderRadius: 8,
          padding: "8px 12px", border: "0.5px solid var(--color-border-tertiary)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", minWidth: 24 }}>{value}</div>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", letterSpacing: 2 }}>
              {value > 0 ? renderTallies(value, symbol) : "–"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      textAlign: "center", fontSize: 16, fontWeight: 700,
      color: "var(--color-text-primary)", marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

// ─── Hlavní stránka ───────────────────────────────────────────────────────────

export default function HomePage() {
  const { userId } = useAuth(true);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const beerMilestoneRef = useRef(0);
  const naMilestoneRef   = useRef(0);
  const statsRef = useRef(EMPTY_STATS);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("drink_entries").select("kind,size").eq("user_id", userId);
    const map: Stats = { ...EMPTY_STATS };
    for (const row of data ?? []) {
      const key = `${row.kind}_${row.size}` as keyof Stats;
      if (key in map) map[key] += 1;
    }
    setStats(map);
    statsRef.current = map;

    // Nastavíme milestone index na správnou pozici podle počtu z DB
    // (každá 2. piva = 1 milestone, takže index = floor(total / 2))
    beerMilestoneRef.current = Math.floor((map.beer_large + map.beer_small) / 2) % BEER_MILESTONES.length;
    naMilestoneRef.current   = Math.floor((map.na_large   + map.na_small)   / 2) % NA_MILESTONES.length;
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const add = async (kind: "beer" | "na", size: "small" | "large") => {
    const ok = confirm("Opravdu přidat záznam?");
    if (!ok) return;
    await supabase.from("drink_entries").insert({ user_id: userId, kind, size });
    await load();

    if (kind === "beer") {
      const total = statsRef.current.beer_large + statsRef.current.beer_small;
      if (total % 2 === 0) {
        const idx = beerMilestoneRef.current % BEER_MILESTONES.length;
        beerMilestoneRef.current += 1;
        setTimeout(() => alert(BEER_MILESTONES[idx]), 300);
      }
    } else {
      const total = statsRef.current.na_large + statsRef.current.na_small;
      if (total % 2 === 0) {
        const idx = naMilestoneRef.current % NA_MILESTONES.length;
        naMilestoneRef.current += 1;
        setTimeout(() => alert(NA_MILESTONES[idx]), 300);
      }
    }
  };

  return (
    <main>
      <style>{`@keyframes fadeInGlass { from { opacity: 0; transform: translateY(-6px) scale(0.9); } to { opacity: 1; transform: none; } }`}</style>
      <h1 className="h1" style={{ marginBottom: 10 }}>Moje statistika</h1>

      {/* ===== PIVO ===== */}
      <div style={{ display: "grid", gap: 6 }}>
        <SectionHeading>🍺 Pivo</SectionHeading>
        <div style={{ display: "flex", gap: 8 }}>
          <GlassButton id="gl-beer-large" type="mug"  color="#EA580C" label="Velké" sublabel="0,5 l"
            initialCount={stats.beer_large} onAdd={() => add("beer", "large")} />
          <GlassButton id="gl-beer-small" type="stem" color="#F97316" label="Malé"  sublabel="0,3 l"
            initialCount={stats.beer_small} onAdd={() => add("beer", "small")} />
        </div>
        <StatRow
          leftLabel="Velká piva"  leftValue={stats.beer_large}  leftSymbol="|"
          rightLabel="Malá piva"  rightValue={stats.beer_small} rightSymbol="×"
        />
      </div>

      {/* ===== NEALKO ===== */}
      <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "10px 0" }} />

      <div style={{ display: "grid", gap: 6 }}>
        <SectionHeading>🥤 Nealko</SectionHeading>
        <div style={{ display: "flex", gap: 8 }}>
          <GlassButton id="gl-na-large" type="mug"  color="#2563EB" label="Velké" sublabel="0,5 l"
            initialCount={stats.na_large} onAdd={() => add("na", "large")} />
          <GlassButton id="gl-na-small" type="stem" color="#3B82F6" label="Malé"  sublabel="0,3 l"
            initialCount={stats.na_small} onAdd={() => add("na", "small")} />
        </div>
        <StatRow
          leftLabel="Velká nealka"  leftValue={stats.na_large}  leftSymbol="|"
          rightLabel="Malá nealka"  rightValue={stats.na_small} rightSymbol="×"
        />
      </div>
    </main>
  );
}
