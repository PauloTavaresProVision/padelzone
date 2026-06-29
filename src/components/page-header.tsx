import { HelpButton, type HelpItem } from "./help-button";

// Cabeçalho de página (admin global) com título, subtítulo e botão de ajuda "?".
export function PageHeader({ title, subtitle, help }: { title: string; subtitle?: string; help?: HelpItem[] }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {help && help.length > 0 && <HelpButton title={`Ajuda: ${title}`} items={help} />}
    </div>
  );
}
