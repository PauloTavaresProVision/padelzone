import { redirect } from "next/navigation";

// Ao abrir o projeto, a entrada é sempre a página pública (homepage).
// Quem quiser a sua área entra por "Iniciar sessão".
export default function Home() {
  redirect("/public");
}
