import { Button, Panel, AccentLabel } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <Panel className="animate-soft-glow mx-auto w-full max-w-xl" padding="lg">
          <AccentLabel className="tracking-[0.35em]">Live Quiz</AccentLabel>
          <h1 className="mt-3 font-display text-6xl leading-none text-ink md:text-7xl">
            Stage<span className="text-[var(--orange)]">Quiz</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Host 控場、最多 20 位挑戰者同步搶答。支援圖片題、歌曲題、限時計分與最終名次。
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button href="/host" variant="primary" size="lg" display>
              我是 Host
            </Button>
            <Button href="/join" variant="accent" size="lg" display>
              我是挑戰者
            </Button>
          </div>
          <p className="mt-6 text-sm text-faint">
            <a
              href="/demo/score-race"
              className="text-[var(--orange-deep)] underline-offset-2 hover:underline"
            >
              衝分排名動畫示範
            </a>
          </p>
        </Panel>
      </div>
    </main>
  );
}
