import { NavLink } from "react-router";
import { UserButton, SignInButton } from "@clerk/react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  Database,
  LayoutDashboard,
  Wand2,
  PenLine,
  Library,
  History,
  Settings,
  Moon,
  Sun,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/format-cost";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/refine", label: "Refine", icon: Wand2 },
  { to: "/write", label: "Write", icon: PenLine },
  { to: "/library", label: "Library", icon: Library },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function TotalCost() {
  const usage = useQuery(api.usageLogs.getUserTotalUsage);
  if (!usage || usage.estimatedCostUsd === 0) return null;
  return (
    <div className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 font-mono text-xs text-muted-foreground">
      <Coins className="size-3" />
      <span>{formatCost(usage.estimatedCostUsd)}</span>
    </div>
  );
}

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 font-semibold">
          <Database className="size-5 text-primary" />
          <span className="hidden sm:inline">SQL Sidekick</span>
        </NavLink>

        {/* Nav links */}
        <Authenticated>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </Authenticated>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <Authenticated>
            <TotalCost />
          </Authenticated>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>

          <Authenticated>
            <UserButton />
          </Authenticated>

          <Unauthenticated>
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}
