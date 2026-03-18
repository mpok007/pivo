"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

function clearSupabaseStorage() {
  try {
    if (typeof window === "undefined") return;

    // Supabase ukládá session do localStorage (typicky klíče začínají "sb-")
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("sb-") || k.includes("supabase")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignorujeme – jen pojistka
  }
}

export function useAuth(requireLogin: boolean) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"admin" | "user">("user");
  const [userId, setUserId] = useState<string | null>(null);

  // useCallback zajistí stabilní referenci funkce – useEffect ji může
  // bezpečně zahrnout do dependency array bez nekonečné smyčky
  const load = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // když je session rozbitá, radši ji vyčisti
      clearSupabaseStorage();
    }

    const session = data.session;

    if (!session) {
      setUserId(null);
      setRole("user");
      setLoading(false);
      if (requireLogin) window.location.replace("/login");
      return;
    }

    const uid = session.user.id;
    setUserId(uid);

    const { data: profData } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", uid)
      .single();

    setRole(profData?.role ?? "user");
    setLoading(false);
  }, [requireLogin]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await load();
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      run();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]); // ✅ žádný eslint-disable – závislost je správně uvedena

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // i kdyby signOut vrátil chybu (např. rozbitý refresh token), stejně vyčistíme localStorage
    } finally {
      clearSupabaseStorage();
      window.location.replace("/login");
    }
  };

  return { loading, role, userId, signOut };
}
