import { Outlet } from "react-router";
import { Header } from "@/components/layout/Header";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Toaster } from "@/components/ui/sonner";

export function Layout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <OfflineBanner />
      <Header />
      <main className="w-full flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
