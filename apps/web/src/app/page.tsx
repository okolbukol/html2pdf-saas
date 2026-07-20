import { signInWithGoogle } from "./actions/auth";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">HTML2PDF Pro</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
        Sign in to your dashboard
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
        Continue with your verified Google account to access your HTML2PDF workspace.
      </p>
      <form action={signInWithGoogle} className="mt-10">
        <button
          className="rounded bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          type="submit"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
