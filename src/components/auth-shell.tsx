import type { ReactNode } from "react";
import Image from "next/image";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <div className="grid grid-cols-1 w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-zinc-900 lg:min-h-[500px] lg:grid-cols-[320px_1fr]">
        <div className="relative hidden bg-[#0c1022] lg:block">
          <Image
            src="/raquete.png"
            alt="PadelZone: o teu jogo, o teu ambiente, a tua zona"
            fill
            sizes="(min-width: 1024px) 320px, 0px"
            className="object-cover object-center"
          />
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-5 sm:px-10 sm:py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/padelzone-logo.png" alt="PadelZone" className="mb-5 h-16 w-auto" />
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </main>
  );
}
