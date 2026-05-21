import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error("Chybí Supabase env proměnné.");
}

const _supabaseUrl = supabaseUrl as string;
const _anonKey     = anonKey as string;
const _serviceKey  = serviceKey as string;

export async function GET(req: Request) {
  try {
    // Ověření volajícího (musí být admin)
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Chybí Authorization token." }, { status: 401 });
    }

    const client = createClient(_supabaseUrl, _anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Neplatný token." }, { status: 401 });
    }

    const admin = createClient(_supabaseUrl, _serviceKey, {
      auth: { persistSession: false },
    });

    const { data: prof, error: profErr } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (profErr || prof?.role !== "admin") {
      return NextResponse.json({ error: "Nemáš oprávnění." }, { status: 403 });
    }

    // Načti všechny auth uživatele
    const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    // Vrať jen user_id a confirmed_at
    const result = authUsers.users.map((u) => ({
      user_id: u.id,
      confirmed_at: u.confirmed_at ?? null,
    }));

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json({ error: "Neplatný request." }, { status: 400 });
  }
}
