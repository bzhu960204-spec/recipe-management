import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { WidthMatrixPage } from '@/features/dev/WidthMatrixPage';
import { ImportPage } from '@/features/import/ImportPage';
import { RecipeEditorPage } from '@/features/recipes/RecipeEditorPage';
import { RecipesPage } from '@/features/recipes/RecipesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TemplatesPage } from '@/features/templates/TemplatesPage';
import { useAuthStore } from '@/stores/auth';

export default function App() {
  const refresh = useAuthStore((state) => state.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {import.meta.env.DEV && (
          <Route path="/dev/widths" element={<RequireAuth><WidthMatrixPage /></RequireAuth>} />
        )}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          {/* No dashboard yet: with only recipes to show there would be nothing to aggregate. */}
          <Route path="/" element={<Navigate to="/recipes" replace />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/new" element={<RecipeEditorPage />} />
          <Route path="/recipes/:id" element={<RecipesPage />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditorPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
