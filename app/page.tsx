"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Stats = {
  beer_small: number;
  beer_large: number;
  na_small: number;
  na_large: number;
};

export default function HomePage() {
  const { userId } = useAuth(true);

  const [stats, setStats] = useState<Stats>({
    beer_small: 0,
    beer_large: 0,
    na_small: 0,
    na_large: 0,
  });

  const load = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("drink_entries")
      .select("kind,size")
      .eq("user_id", userId);

    const map: Stats = {
      beer_small: 0,
      beer_large: 0,
      na_small: 0,
      na_large: 0,
    };

    for (const row of data ?? []) {
      const key = `${row.kind}_${row.size}` as keyof Stats;
      if (key in map) map[key] += 1;
    }

    setStats(map);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const add = async (kind: "beer" | "na", size: "small" | "large") => {
    const ok = confirm("Opravdu přidat záznam?");
    if (!ok) return;

    await supabase.from("drink_entries").insert({
      user_id: userId,
      kind,
      size,
    });

    await load();
  };

  // vytvoří vizuální čárky (卌 po 5 kusech)
  const renderTallies = (count: number, symbol: string) => {
    const groups = Math.floor(count / 5);
    const rest = count % 5;

    return (
      <>
        {"卌".repeat(groups)}
        {symbol.repeat(rest)}
      </>
    );
  };

  const Button = ({
    label,
    color,
    onClick,
  }: {
    label: string;
    color: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        height: 54,       // zachováme menší výšku
        borderRadius: 14,
        fontSize: 16,
        fontWeight: 700,
        background: color,
        color: "white",
        border: "none",
      }}
    >
      {label}
    </button>
  );

  return (
    <main>
      <h1 className="h1">Moje statistika</h1>

      {/* ===== PIVO ===== */}
      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <Button
            label="Pivo – velké"
            color="#ea580c"
            onClick={() => add("beer", "large")}
          />
          <Button
            label="Pivo – malé"
            color="#f97316"
            onClick={() => add("beer", "small")}
          />
        </div>

        <div style={{ fontSize: 14 }}>
          <div><b>Velké:</b> {stats.beer_large}</div>
          <div style={{ fontSize: 20, letterSpacing: 2 }}>
            {renderTallies(stats.beer_large, "|")}
          </div>

          <div style={{ marginTop: 8 }}><b>Malé:</b> {stats.beer_small}</div>
          <div style={{ fontSize: 20, letterSpacing: 2 }}>
            {renderTallies(stats.beer_small, "×")}
          </div>
        </div>
      </div>

      {/* ===== NEALKO ===== */}
      <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <Button
            label="Nealko – velké"
            color="#2563eb"
            onClick={() => add("na", "large")}
          />
          <Button
            label="Nealko – malé"
            color="#3b82f6"
            onClick={() => add("na", "small")}
          />
        </div>

        <div style={{ fontSize: 14 }}>
          <div><b>Velké:</b> {stats.na_large}</div>
          <div style={{ fontSize: 20, letterSpacing: 2 }}>
            {renderTallies(stats.na_large, "|")}
          </div>

          <div style={{ marginTop: 8 }}><b>Malé:</b> {stats.na_small}</div>
          <div style={{ fontSize: 20, letterSpacing: 2 }}>
            {renderTallies(stats.na_small, "×")}
          </div>
        </div>
      </div>
    </main>
  );
}
