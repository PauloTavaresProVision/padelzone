import { Home, Trophy, Swords, BarChart3, CreditCard, MessageSquare, User } from "lucide-react";

// Navegação da área do jogador (única fonte para sidebar + menu móvel).
export const PLAYER_NAV = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/torneios", label: "Torneios", icon: Trophy },
  { href: "/jogos", label: "Jogos", icon: Swords },
  { href: "/ranking", label: "Ranking", icon: BarChart3 },
  { href: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/perfil", label: "Perfil", icon: User },
];
