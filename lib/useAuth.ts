"use client";

import { useEffect, useState } from "react";
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
  const [role, setRole] = useState<string>("user");
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
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

    const prof = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", uid)
      .single();

    setRole(prof.data?.role ?? "user");
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      setLoading(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireLogin]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      // i kdyby signOut vrátil chybu (např. rozbitý refresh token), stejně vyčistíme localStorage
      if (error) {
        // volitelně můžeš dát alert, ale většinou stačí vyčistit
        // alert("Odhlášení: " + error.message);
      }
    } finally {
      clearSupabaseStorage();
      window.location.replace("/login");
    }
  };

  return { loading, role, userId, signOut };
}
