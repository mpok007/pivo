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

const ML = { small: 300, large: 500 };

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

  const beerLiters = useMemo(() => {
    return (
      (stats.beer_small * ML.small + stats.beer_large * ML.large) / 1000
    ).toFixed(1);
  }, [stats]);

  const naLiters = useMemo(() => {
    return (
      (stats.na_small * ML.small + stats.na_large * ML.large) / 1000
    ).toFixed(1);
  }, [stats]);

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
        height: 54,                 // menší výška
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

      {/* PIVO */}
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

        <div style={{ fontSize: 14, opacity: 0.85 }}>
          🍺 {stats.beer_large}×0,5 • {stats.beer_small}×0,3 → <b>{beerLiters} L</b>
        </div>
      </div>

      {/* NEALKO */}
      <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
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

        <div style={{ fontSize: 14, opacity: 0.85 }}>
          🥤 {stats.na_large}×0,5 • {stats.na_small}×0,3 → <b>{naLiters} L</b>
        </div>
      </div>
    </main>
  );
}
