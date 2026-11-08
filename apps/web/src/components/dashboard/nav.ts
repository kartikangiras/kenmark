import {
  Activity,
  BookOpen,
  FileCheck2,
  FlaskConical,
  KeyRound,
  LayoutGrid,
  Search,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/verify", label: "Verify", icon: Search },
  { href: "/dashboard/explorer", label: "Explorer", icon: Activity },
  { href: "/dashboard/attestations", label: "Attestations", icon: FileCheck2 },
  { href: "/dashboard/issuers", label: "Issuers", icon: KeyRound },
  { href: "/dashboard/validation", label: "Real-world validation", icon: FlaskConical },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
