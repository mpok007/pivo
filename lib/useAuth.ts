"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useAuth(requireLogin: boolean) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("user");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        if (requireLogin) window.location.href = "/login";
        if (mounted) {
          setUserId(null);
          setRole("user");
          setLoading(false);
        }
        return;
      }

      const uid = session.user.id;
      const prof = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", uid)
        .single();

      if (mounted) {
        setUserId(uid);
        setRole(prof.data?.role ?? "user");
        setLoading(false);
      }
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => run());

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [requireLogin]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return { loading, role, userId, signOut };
}
