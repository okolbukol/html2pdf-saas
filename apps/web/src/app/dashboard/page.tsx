import { redirect } from "next/navigation";
import React from "react";
import { auth } from "../../auth";
import { signOutCurrentSession } from "../actions/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/");

  const displayName = session.user.name ?? session.user.email;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
      <header className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            HTML2PDF Pro
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Dashboard</h1>
        </div>
        <form action={signOutCurrentSession}>
          <button
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            type="submit"
          >
            Log out
          </button>
        </form>
      </header>

      <section className="mt-10" aria-labelledby="account-heading">
        <p className="text-sm font-medium text-emerald-700">Authenticated</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950" id="account-heading">
          {displayName}
        </h2>
      </section>

      <section
        className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
        aria-labelledby="pdfs-heading"
      >
        <h2 className="text-lg font-semibold text-slate-950" id="pdfs-heading">
          No PDFs yet.
        </h2>
      </section>
    </main>
  );
}
