"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest, type SessionUser } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiRequest<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.user.role !== "ADMIN") {
        await apiRequest<void>("/api/auth/logout", { method: "POST" });
        setError("This account does not have administrator access.");
        return;
      }
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f5f1e9] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#38271f] p-12 text-[#f5f1e9] lg:flex lg:flex-col lg:justify-between xl:p-16">
        <Link href="/" className="font-serif text-2xl tracking-[.2em]">ATELIER<span className="text-[#c4a68b]">.</span></Link>
        <div className="relative z-10 max-w-xl pb-12">
          <p className="eyebrow text-[#c4a68b]">Private workspace</p>
          <h1 className="mt-6 font-serif text-7xl leading-[.95] tracking-[-.05em]">A considered<br/><i className="font-normal">way to work.</i></h1>
          <p className="mt-7 max-w-sm text-sm leading-7 text-white/60">Manage your collection, monitor stock, and keep every order moving with care.</p>
        </div>
        <p className="eyebrow text-white/40">ATELIER · ADMINISTRATION</p>
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[430px] w-[430px] rounded-full border border-white/10"/>
        <div className="pointer-events-none absolute -bottom-4 -right-4 h-[300px] w-[300px] rounded-full border border-white/10"/>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[410px]">
          <Link href="/" className="mb-14 inline-flex items-center gap-2 text-xs text-black/55 transition hover:text-black lg:hidden"><ArrowLeft size={15}/> Back to store</Link>
          <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-full border border-black/15"><ShieldCheck size={20} strokeWidth={1.4}/></div>
          <p className="eyebrow text-[#8b7764]">Administrator access</p>
          <h2 className="mt-4 font-serif text-5xl tracking-[-.04em]">Welcome back.</h2>
          <p className="mt-4 text-sm leading-6 text-black/55">Sign in with your store administrator account to continue.</p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-[10px] uppercase tracking-[.16em]">Email address</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-black/20 bg-white/40 px-4 py-3.5 text-sm outline-none transition focus:border-[#76533b]" placeholder="admin@yourbrand.com"/>
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-[10px] uppercase tracking-[.16em]">Password</label>
              <div className="flex border border-black/20 bg-white/40 focus-within:border-[#76533b]">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none" placeholder="Enter your password"/>
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="px-4 text-black/50 hover:text-black">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
              </div>
            </div>
            {error && <p role="alert" className="border border-red-900/15 bg-red-900/5 px-4 py-3 text-sm text-red-900">{error}</p>}
            <button disabled={busy} className="flex w-full items-center justify-between bg-[#38271f] px-5 py-4 text-[10px] uppercase tracking-[.18em] text-[#f5f1e9] transition hover:bg-[#76533b] disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in to dashboard"} <ArrowRight size={16}/>
            </button>
          </form>
          <div className="mt-8 border-t border-black/10 pt-5 text-xs leading-5 text-black/45">
            <p>Administrator accounts are provisioned securely from the API environment. Public registration never grants admin privileges.</p>
          </div>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-black/55 hover:text-black"><ArrowLeft size={14}/> Return to storefront</Link>
        </div>
      </section>
    </main>
  );
}
