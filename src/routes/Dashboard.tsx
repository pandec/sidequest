import { NavLink } from "react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Wand2, PenLine, Library } from "lucide-react";

const quickActions = [
  {
    to: "/refine",
    title: "Refine a Query",
    description: "Paste SQL and get an optimized version with explanations.",
    icon: Wand2,
  },
  {
    to: "/write",
    title: "Write a Query",
    description: "Describe what you need and let AI write it for you.",
    icon: PenLine,
  },
  {
    to: "/library",
    title: "Query Library",
    description: "Browse and manage your saved queries.",
    icon: Library,
  },
] as const;

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to SQL Sidekick
          </h1>
          <p className="mt-2 text-muted-foreground">
            Refine, write, and manage BigQuery SQL queries with AI assistance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
