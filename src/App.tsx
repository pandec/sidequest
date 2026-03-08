import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/layout/Layout";
import { useStoreUser } from "@/hooks/useStoreUser";
import Dashboard from "@/routes/Dashboard";
import Notes from "@/routes/Notes";
import SettingsPage from "@/routes/Settings";

function AppContent() {
  useStoreUser();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="notes" element={<Notes />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}
