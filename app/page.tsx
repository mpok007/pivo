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

const MILESTONES: string[] = [
  "Testuješ kvalitu, nebo jen vytrvalost? 🧐",
  "Ty máš dneska permanentku na výčep? 🎫",
  "Klid, nech něco i pro ostatní, hrdino! 🦸",
  "Ty to bereš zodpovědně, aby pivo nezteplalo, viď? 🌡️",
  "Ty už to pivo nepiješ, Ty ho likviduješ! 💥",
  "Cože už tolik? To už pojedeme podle sudů ne? 🛢️",
  "Ty už si zasloužíš věrnostní kartu s fotkou. 📸",
  "Ty nepiješ na žízeň, Ty to máš jako životní styl. 😎",
  "Jestli dáš ještě jedno, tak snad umřeš! ☠️",
];

// ─── SVG builders ─────────────────────────────────────────────────────────────

function buildMugSVG(id: string, fillPct: number, color: string): string {
  const w = 48, h = 58;
  const glassL = 3, glassR = w - 10, glassT = 4, glassB = h - 3;
  const innerL = glassL + 3, innerR = glassR - 3;
  const innerT = glassT + 3, innerB = glassB - 3;
  const innerH = innerB - innerT;
  const liquidH = innerH * fillPct;
  const liquidT = innerB - liquidH;
  const foamH = fillPct > 0.05 ? Math.min(9, liquidH * 0.25) : 0;
  const beerT = liquidT + foamH;
  const foam = "#FEF3C7", beer = "#D97706";

  let html = `<defs><clipPath id="clip-${id}"><rect x="${innerL}" y="${innerT}" width="${innerR - innerL}" height="${innerH}"/></clipPath></defs>`;

  // Výplň sklenice průhledná
  html += `<rect x="${glassL}" y="${glassT}" width="${glassR - glassL}" height="${glassB - glassT}" rx="4" fill="rgba(0,0,0,0.08)" stroke="${color}" stroke-width="2"/>`;

  if (fillPct > 0.02) {
    html += `<rect x="${innerL}" y="${beerT}" width="${innerR - innerL}" height="${innerB - beerT}" fill="${beer}" clip-path="url(#clip-${id})"/>`;
    if (fillPct > 0.15) {
      [[0.25, 0.7, 1.5], [0.55, 0.5, 1], [0.4, 0.82, 1]].forEach(([rx, ry, rr]) => {
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
        html += `<circle cx="${innerL + fw * (0.18 + i * 0.3)}" cy="${liquidT + foamH * 0.4}" r="2" fill="rgba(255,255,255,0.8)" clip-path="url(#clip-${id})"/>`;
    }
  }

  // Lesk a ucho ve stejné barvě jako obrys
  html += `<line x1="${glassL + 5}" y1="${glassT + 5}" x2="${glassL + 3}" y2="${glassB - 8}" stroke="${color}" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>`;
  html += `<path d="M ${glassR - 1} ${glassT + 10} C ${w + 2} ${glassT + 10} ${w + 2} ${glassB - 12} ${glassR - 1} ${glassB - 12}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
  return html;
}

function buildStemSVG(id: string, fillPct: number, color: string): string {
  const w = 40, h = 58;
  const bowlTL = 3, bowlTR = w - 3, bowlBL = 12, bowlBR = w - 12, bowlT = 3, bowlB = 36;
  const innerTL = bowlTL + 3, innerTR = bowlTR - 3, innerBL = bowlBL + 2, innerBR = bowlBR - 2;
  const innerT = bowlT + 3, innerB = bowlB - 2, innerH = innerB - innerT;
  const liquidH = innerH * fillPct, liquidT = innerB - liquidH;
  const foamH = fillPct > 0.05 ? Math.min(8, liquidH * 0.25) : 0, beerT = liquidT + foamH;
  const foam = "#FEF3C7", beer = "#D97706";
  const clipPts = `${innerTL},${innerT} ${innerTR},${innerT} ${innerBR},${innerB} ${innerBL},${innerB}`;
  const totalH = bowlB - bowlT;

  function xAtY(y: number, isLeft: boolean) {
    const t = (y - bowlT) / totalH;
    return isLeft ? bowlTL + (bowlBL - bowlTL) * t + 3 : bowlTR + (bowlBR - bowlTR) * t - 3;
  }

  let html = `<defs><clipPath id="clip-${id}"><polygon points="${clipPts}"/></clipPath></defs>`;

  // Průhledná výplň, barevný obrys
  html += `<polygon points="${bowlTL},${bowlT} ${bowlTR},${bowlT} ${bowlBR},${bowlB} ${bowlBL},${bowlB}" fill="rgba(0,0,0,0.08)" stroke="${color}" stroke-width="2"/>`;

  if (fillPct > 0.02) {
    const bTL = xAtY(beerT, true), bTR = xAtY(beerT, false);
    html += `<polygon points="${bTL},${beerT} ${bTR},${beerT} ${innerBR},${innerB} ${innerBL},${innerB}" fill="${beer}" clip-path="url(#clip-${id})"/>`;
    if (fillPct > 0.15) {
      [[0.3, 0.65, 1.2], [0.6, 0.5, 1], [0.45, 0.8, 1]].forEach(([rx, ry, rr]) => {
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
        html += `<circle cx="${fTL + fw * (0.15 + i * 0.32)}" cy="${liquidT + foamH * 0.4}" r="1.8" fill="rgba(255,255,255,0.8)" clip-path="url(#clip-${id})"/>`;
    }
  }

  const stemX = w / 2;
  html += `<line x1="${bowlTL + 5}" y1="${bowlT + 4}" x2="${bowlBL + 3}" y2="${bowlB - 6}" stroke="${color}" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>`;
  html += `<line x1="${stemX}" y1="${bowlB}" x2="${stemX}" y2="${h - 5}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  html += `<ellipse cx="${stemX}" cy="${h - 5}" rx="9" ry="2.5" fill="none" stroke="${color}" stroke-width="2"/>`;
  return html;
}

// ─── Komponenta sklenice ──────────────────────────────────────────────────────

type GlassType = "mug" | "stem";

function GlassButton({
  type,
  color,
  label,
  sublabel,
  onAdd,
}: {
  type: GlassType;
  color: string;
  label: string;
  sublabel: string;
  onAdd: () => void;
}) {
  const [fillPct, setFillPct] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [newFill, setNewFill] = useState(0);
  const countRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const fillRef = useRef(0);

  const svgW = type === "mug" ? 48 : 40;
  const svgH = 58;
  const buildSVG = type === "mug" ? buildMugSVG : buildStemSVG;
  const idA = `glass-${type}-${color.replace("#", "")}-a`;
  const idB = `glass-${type}-${color.replace("#", "")}-b`;

  function animate(from: number, to: number, setter: (v: number) => void, onDone?: () => void) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const dur = 600, start = performance.now();
    function step(now: number) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const val = from + (to - from) * ease;
      setter(val);
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
      setWaiting(false);
      setNewVisible(false);
      setFillPct(0);
      fillRef.current = 0;
      countRef.current = 1;
      const toPct = 1 / 5 * 0.92;
      setTimeout(() => animate(0, toPct, (v) => { setFillPct(v); fillRef.current = v; }), 50);
      return;
    }

    if (posInCycle === 0) {
      animate(fillRef.current, 1.0, (v) => { setFillPct(v); fillRef.current = v; }, () => {
        setWaiting(true);
        setNewVisible(true);
        setNewFill(0);
      });
    } else {
      const toPct = posInCycle / 5 * 0.92;
      animate(fillRef.current, toPct, (v) => { setFillPct(v); fillRef.current = v; });
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        border: `2px solid ${color}`,
        borderRadius: 16,
        padding: "18px 12px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: "transparent",   // ← průhledné pozadí
        color: color,                 // ← text ve stejné barvě jako obrys
        flex: 1,
        transition: "transform 0.1s ease, opacity 0.1s ease",
      }}
    >
      <div style={{ height: 60, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
        <svg
          width={svgW} height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          dangerouslySetInnerHTML={{ __html: buildSVG(idA, waiting ? 1.0 : fillPct, color) }}
        />
        {newVisible && (
          <svg
            width={svgW} height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ animation: "fadeInGlass 0.4s ease" }}
            dangerouslySetInnerHTML={{ __html: buildSVG(idB, newFill, color) }}
          />
        )}
      </div>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 11, opacity: 0.6 }}>{sublabel}</span>
    </button>
  );
}

// ─── Čárky ───────────────────────────────────────────────────────────────────

function renderTallies(count: number, symbol: string) {
  const groups = Math.floor(count / 5);
  const rest = count % 5;
  return (<>{"卌".repeat(groups)}{symbol.repeat(rest)}</>);
}

// ─── Stat karta ───────────────────────────────────────────────────────────────

function StatCard({ label, value, symbol }: { label: string; value: number; symbol: string }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRadius: 8, padding: "10px 14px",
      border: "0.5px solid var(--color-border-tertiary)",
    }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginTop: 2, letterSpacing: 2 }}>
        {value > 0 ? renderTallies(value, symbol) : "–"}
      </div>
    </div>
  );
}

// ─── Hlavní stránka ───────────────────────────────────────────────────────────

export default function HomePage() {
  const { userId } = useAuth(true);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const milestoneIndexRef = useRef(0);
  const statsRef = useRef(EMPTY_STATS);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("drink_entries")
      .select("kind,size")
      .eq("user_id", userId);

    const map: Stats = { ...EMPTY_STATS };
    for (const row of data ?? []) {
      const key = `${row.kind}_${row.size}` as keyof Stats;
      if (key in map) map[key] += 1;
    }
    setStats(map);
    statsRef.current = map;
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const add = async (kind: "beer" | "na", size: "small" | "large") => {
    const ok = confirm("Opravdu přidat záznam?");
    if (!ok) return;

    await supabase.from("drink_entries").insert({ user_id: userId, kind, size });
    await load();

    // Hláška po každém 2. pivu (jen pivo, ne nealko)
    if (kind === "beer") {
      const newTotal = statsRef.current.beer_large + statsRef.current.beer_small;
      if (newTotal % 2 === 0) {
        const idx = milestoneIndexRef.current % MILESTONES.length;
        milestoneIndexRef.current += 1;
        setTimeout(() => alert(MILESTONES[idx]), 300);
      }
    }
  };

  return (
    <main>
      <style>{`@keyframes fadeInGlass { from { opacity: 0; transform: translateY(-6px) scale(0.9); } to { opacity: 1; transform: none; } }`}</style>

      <h1 className="h1">Moje statistika</h1>

      {/* ===== PIVO ===== */}
      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <GlassButton type="mug"  color="#EA580C" label="Velké" sublabel="0,5 l" onAdd={() => add("beer", "large")} />
          <GlassButton type="stem" color="#F97316" label="Malé"  sublabel="0,3 l" onAdd={() => add("beer", "small")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatCard label="Velká piva" value={stats.beer_large} symbol="|" />
          <StatCard label="Malá piva"  value={stats.beer_small} symbol="×" />
        </div>
      </div>

      {/* ===== NEALKO ===== */}
      <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "20px 0 16px" }} />

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <GlassButton type="mug"  color="#2563EB" label="Velké" sublabel="0,5 l" onAdd={() => add("na", "large")} />
          <GlassButton type="stem" color="#3B82F6" label="Malé"  sublabel="0,3 l" onAdd={() => add("na", "small")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatCard label="Velká nealka" value={stats.na_large} symbol="|" />
          <StatCard label="Malá nealka"  value={stats.na_small} symbol="×" />
        </div>
      </div>
    </main>
  );
}
