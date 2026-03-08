import { NavLink } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StickyNote, Settings } from "lucide-react";

const quickActions = [
  {
    to: "/notes",
    title: "Notes",
    description: "Create and manage your notes.",
    icon: StickyNote,
  },
  {
    to: "/settings",
    title: "Settings",
    description: "Configure your preferences.",
    icon: Settings,
  },
] as const;

export default function Dashboard() {
  const settings = useQuery(api.settings.get);
  const displayName = settings?.displayName;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to SideQuest
            {displayName ? `, ${displayName}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your starter template for building full-stack apps
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map(({ to, title, description, icon: Icon }) => (
            <NavLink key={to} to={to} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </NavLink>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
