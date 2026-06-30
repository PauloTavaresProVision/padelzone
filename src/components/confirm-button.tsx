"use client";

// Botão de submit que pede confirmação antes de executar (ações destrutivas:
// gerar/refazer quadro, limpar sorteio, recomeçar, etc.).
export function ConfirmButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
