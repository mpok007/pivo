"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function NavBar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // veřejné stránky (bez vynucení login)
  const isPublic = pathname === "/login" || pathname === "/set-password";

  const { loading, role, signOut } = useAuth(!isPublic);

  if (isPublic) {
    return <div className="container">{children}</div>;
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Načítám…</div>;
  }

  return (
    <>
      <nav
        style={{
          padding: 16,
          borderBottom: "1px solid #e5e5e5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/">Pivo</Link>

          {role === "admin" && (
            <>
              <Link href="/admin">Statistiky</Link>
              <Link href="/admin/users">Uživatelé</Link>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ opacity: 0.75 }}>
            Role: <b>{role}</b>
          </span>
          <button onClick={() => signOut()}>Odhlásit</button>
        </div>
      </nav>

      <div className="container">{children}</div>
    </>
  );
}
