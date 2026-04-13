"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (r?.error) {
        setErr("Anmeldung fehlgeschlagen.");
        return;
      }
      router.replace("/baustellen");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Anmelden</h1>
      <div>
        <label className="text-sm font-medium text-slate-700">E-Mail</label>
        <Input type="email" autoComplete="email" required className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Passwort</label>
        <Input
          type="password"
          autoComplete="current-password"
          required
          className="mt-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="ml-2">Anmelden …</span>
          </>
        ) : (
          "Anmelden"
        )}
      </Button>
    </form>
  );
}
