"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Stats = {
  beer_small: number;
  beer_large: number;
  na_small: number;
  na_large: number;
};

const ML = {
  small: 300,
  large: 500,
};

function tallyMarks(n: number) {
  // každých 5 = "||||/" (4 čárky přeškrtnuté), zbytek = "|"
  const groups = Math.floor(n / 5);
  const rem = n % 5;
  const parts: string[] = [];
  for (let i = 0; i < groups; i++) parts.push("||||/");
  if (rem > 0) parts.push("|".repeat(rem));
  return parts.join("  "); // mezery mezi skupinami
}

function crossMarks(n: number) {
  // malé = křížky
  return "× ".repeat(n).trim();
}

function StatBlock({
  title,
  smallCount,
  largeCount,
}: {
  title: string;
  smallCount: number;
  largeCount: number;
}) {
  const totalMl = smallCount * ML.small + largeCount * ML.large;
  const totalL = (totalMl / 1000).toFixed(1);

  return (
    <div
      className="cardTight"
      style={{
        border: "1px solid #e5e5e5",
        marginTop: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 800 }}>{title}</div>

      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <b>Velké:</b> {largeCount}{" "}
          <span style={{ opacity: 0.8 }}>(0,5)</span>
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 18,
            lineHeight: 1.3,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            opacity: 0.95,
          }}
        >
          {largeCount > 0 ? tallyMarks(largeCount) : "—"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <b>Malé:</b> {smallCount}{" "}
          <span style={{ opacity: 0.8 }}>(0,3)</span>
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 18,
            lineHeight: 1.3,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            opacity: 0.95,
          }}
        >
          {smallCount > 0 ? crossMarks(smallCount) : "—"}
        </div>
      </div>

      <div>
        <b>Celkem:</b> {totalL} L
      </div>
    </div>
  );
}

export default function HomePage() {
  const { userId } = useAuth(true);

  const [stats, setStats] = useState<Stats>({
    beer_small: 0,
    beer_large: 0,
    na_small: 0,
    na_large: 0,
  });

  const loadMyStats = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("drink_entries")
      .select("kind,size,user_id")
      .eq("user_id", userId);

    if (error) {
      alert("Chyba načtení statistik: " + error.message);
      return;
    }

    const s: Stats = { beer_small: 0, beer_large: 0, na_small: 0, na_large: 0 };
    for (const r of data ?? []) {
      const key = `${r.kind}_${r.size}` as keyof Stats;
      if (key in s) s[key] += 1;
    }
    setStats(s);
  };

  useEffect(() => {
    loadMyStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const totalBeerMl = useMemo(
    () => stats.beer_small * ML.small + stats.beer_large * ML.large,
    [stats]
  );
  const totalNaMl = useMemo(
    () => stats.na_small * ML.small + stats.na_large * ML.large,
    [stats]
  );

  const add = async (kind: "beer" | "na", size: "small" | "large") => {
    if (!userId) return;

    const label =
      kind === "beer"
        ? size === "large"
          ? "Pivo – velké (0,5)"
          : "Pivo – malé (0,3)"
        : size === "large"
        ? "Nealko – velké (0,5)"
        : "Nealko – malé (0,3)";

    const ok = confirm(`Opravdu přidat: ${label}?`);
    if (!ok) return;

    const { error } = await supabase.from("drink_entries").insert({
      user_id: userId,
      kind,
      size,
    });

    if (error) return alert("Chyba zápisu: " + error.message);
    loadMyStats();
  };

  const tileBase: React.CSSProperties = {
    width: "100%",
    aspectRatio: "1 / 1",
    display: "grid",
    placeItems: "center",
    fontSize: 18,
    fontWeight: 800,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
    padding: 10,
  };

  const beerStyle: React.CSSProperties = {
    ...tileBase,
    background: "#f59e0b", // oranžová
    color: "#111",
  };

  const naStyle: React.CSSProperties = {
    ...tileBase,
    background: "#2563eb", // modrá (stejná jako tlačítka)
    color: "#fff",
  };

  return (
    <main>
      <h1 className="h1">Klikni a přičti</h1>

      {/* ===== PIVO ===== */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10, opacity: 0.9 }}>Pivo</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <button style={beerStyle} onClick={() => add("beer", "large")}>
            Pivo<br />velké
          </button>

          <button style={beerStyle} onClick={() => add("beer", "small")}>
            Pivo<br />malé
          </button>
        </div>

        <StatBlock
          title="Pivo – statistika"
          largeCount={stats.beer_large}
          smallCount={stats.beer_small}
        />
      </div>

      {/* ===== NEALKO ===== */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontWeight: 900, marginBottom: 10, opacity: 0.9 }}>Nealko</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <button style={naStyle} onClick={() => add("na", "large")}>
            Nealko<br />velké
          </button>

          <button style={naStyle} onClick={() => add("na", "small")}>
            Nealko<br />malé
          </button>
        </div>

        <StatBlock
          title="Nealko – statistika"
          largeCount={stats.na_large}
          smallCount={stats.na_small}
        />
      </div>

      {/* Souhrn dole */}
      <div
        className="cardTight"
        style={{
          border: "1px solid #e5e5e5",
          marginTop: 22,
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ fontWeight: 800 }}>Souhrn</div>
        <div>Pivo celkem: <b>{(totalBeerMl / 1000).toFixed(1)} L</b></div>
        <div>Nealko celkem: <b>{(totalNaMl / 1000).toFixed(1)} L</b></div>
      </div>
    </main>
  );
}
