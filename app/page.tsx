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

export default function HomePage() {
  const { role, userId } = useAuth(true);

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

  const totalBeerL = (totalBeerMl / 1000).toFixed(1);
  const totalNaL = (totalNaMl / 1000).toFixed(1);

  const add = async (kind: "beer" | "na", size: "small" | "large") => {
    if (!userId) return;

    const { error } = await supabase.from("drink_entries").insert({
      user_id: userId,
      kind,
      size,
    });

    if (error) return alert("Chyba zápisu: " + error.message);
    loadMyStats();
  };

  return (
    <main>
      <h1 className="h1">Moje statistiky</h1>

      <div className="formGrid" style={{ marginTop: 14 }}>
        {/* 4 velká tlačítka */}
        <button onClick={() => add("beer", "large")} style={{ fontSize: 18, padding: 16 }}>
          Pivo – velké
        </button>
        <button onClick={() => add("beer", "small")} style={{ fontSize: 18, padding: 16 }}>
          Pivo – malé
        </button>
        <button onClick={() => add("na", "large")} style={{ fontSize: 18, padding: 16 }}>
          Nealko – velké
        </button>
        <button onClick={() => add("na", "small")} style={{ fontSize: 18, padding: 16 }}>
          Nealko – malé
        </button>
      </div>

      {/* Statistiky */}
      <div className="cardTight" style={{ border: "1px solid #e5e5e5", marginTop: 18, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>Přehled</div>

        <div>Pivo malé (0,3): <b>{stats.beer_small}</b></div>
        <div>Pivo velké (0,5): <b>{stats.beer_large}</b></div>
        <div>Pivo celkem: <b>{totalBeerL} L</b></div>

        <div style={{ marginTop: 6 }}>Nealko malé (0,3): <b>{stats.na_small}</b></div>
        <div>Nealko velké (0,5): <b>{stats.na_large}</b></div>
        <div>Nealko celkem: <b>{totalNaL} L</b></div>
      </div>
    </main>
  );
}
