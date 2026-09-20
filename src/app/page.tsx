import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(251,191,36,0.18),transparent_50%),radial-gradient(ellipse_at_80%_0%,rgba(244,114,182,0.12),transparent_45%),linear-gradient(160deg,#0c0a09_0%,#1c1410_45%,#0f172a_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/70">
          Live Quiz
        </p>
        <h1 className="mt-3 font-display text-6xl leading-none text-amber-50 md:text-7xl">
          StageQuiz
        </h1>
        <p className="mt-5 max-w-md text-lg text-white/65">
          Host 控場、最多 20 位挑戰者同步搶答。支援圖片題、歌曲題、限時計分與最終名次。
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/host"
            className="rounded-2xl bg-amber-400 px-6 py-3.5 font-display text-lg text-ink transition hover:bg-amber-300"
          >
            我是 Host
          </Link>
          <Link
            href="/join"
            className="rounded-2xl bg-white/10 px-6 py-3.5 font-display text-lg text-amber-50 ring-1 ring-white/20 transition hover:bg-white/15"
          >
            我是挑戰者
          </Link>
        </div>
      </div>
    </main>
  );
}
