import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { FormsPage } from './pages/dashboard/FormsPage';
import { FormBuilderPage } from './pages/dashboard/FormBuilderPage';
import { ShortlinksPage } from './pages/dashboard/ShortlinksPage';
import { StandaloneFormPage } from './pages/s/StandaloneFormPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/s/:shortCode" element={<StandaloneFormPage />} />

      {/* Protected dashboard */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="forms" replace />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="forms/:formId/builder" element={<FormBuilderPage />} />
        <Route path="shortlinks" element={<ShortlinksPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
