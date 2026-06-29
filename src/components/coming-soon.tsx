import { Sparkles } from "lucide-react";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-purple/10 text-brand-purple">
        <Sparkles className="size-7" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">Em construção. Disponível em breve.</p>
    </div>
  );
}
