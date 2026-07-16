const foundations = [
  "Next.js App Router",
  "TypeScript strict mode",
  "Tailwind CSS",
  "Environment validation",
  "Prisma database package",
  "Vitest test setup"
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">HTML2PDF Pro</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
        MVP infrastructure foundation
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
        Phase 1 and Phase 2 establish the product architecture, project structure and baseline
        engineering controls before authentication, PDF generation, workers, payments or API keys
        are implemented.
      </p>
      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Foundation">
        {foundations.map((item) => (
          <div
            key={item}
            className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-800"
          >
            {item}
          </div>
        ))}
      </section>
    </main>
  );
}
