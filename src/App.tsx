import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "next-themes";
import { Layout } from "@/components/layout/Layout";
import { useStoreUser } from "@/hooks/useStoreUser";
import Dashboard from "@/routes/Dashboard";
import Refine from "@/routes/Refine";
import Write from "@/routes/Write";
import Library from "@/routes/Library";
import LibraryDetail from "@/routes/LibraryDetail";
import SettingsPage from "@/routes/Settings";
import SchemaDiagram from "@/routes/SchemaDiagram";
import History from "@/routes/History";

function AppContent() {
  // Sync Clerk user to Convex on every auth change
  useStoreUser();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="refine" element={<Refine />} />
        <Route path="write" element={<Write />} />
        <Route path="library" element={<Library />} />
        <Route path="library/:id" element={<LibraryDetail />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="history" element={<History />} />
        <Route path="schema/:id" element={<SchemaDiagram />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}
