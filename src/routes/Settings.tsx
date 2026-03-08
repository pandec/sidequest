import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, Loader2 } from "lucide-react";

// ─── Profile Section ─────────────────────────────────────────────────────────

function ProfileSection() {
  const settings = useQuery(api.settings.get);
  const updateSettings = useMutation(api.settings.update);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed input when settings load
  useEffect(() => {
    if (settings?.displayName !== undefined) {
      setDisplayName(settings.displayName);
    }
  }, [settings?.displayName]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({ displayName: displayName.trim() });
      toast.success("Display name saved.");
    } catch {
      toast.error("Failed to save display name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Set your display name. This is how others will see you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Appearance Section ──────────────────────────────────────────────────────

function AppearanceSection() {
  const { resolvedTheme, setTheme } = useTheme();
  const updateSettings = useMutation(api.settings.update);

  const isDark = resolvedTheme === "dark";

  async function handleToggle(checked: boolean) {
    const newTheme = checked ? "dark" : "light";
    setTheme(newTheme);
    try {
      await updateSettings({ theme: newTheme as "light" | "dark" });
      toast.success(`Theme set to ${newTheme}.`);
    } catch {
      toast.error("Failed to save theme preference.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Toggle between light and dark mode. Your preference is synced across
          devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon className="size-5 text-muted-foreground" />
            ) : (
              <Sun className="size-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isDark ? "Dark Mode" : "Light Mode"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isDark
                  ? "Using dark color scheme"
                  : "Using light color scheme"}
              </p>
            </div>
          </div>
          <Switch checked={isDark} onCheckedChange={handleToggle} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Settings Page ───────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and preferences
          </p>
        </div>

        <ProfileSection />
        <AppearanceSection />

        <p className="text-center text-sm text-muted-foreground">
          More settings coming soon
        </p>
      </div>
    </ProtectedRoute>
  );
}
