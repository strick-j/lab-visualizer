import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  DashboardPage,
  EC2ListPage,
  RDSListPage,
  VPCPage,
  TerraformPage,
  TopologyPage,
  LoginPage,
  SettingsPage,
  AuthCallbackPage,
  SetupPage,
} from "@/pages";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Protected routes - require authentication */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="ec2" element={<EC2ListPage />} />
                <Route path="rds" element={<RDSListPage />} />
                <Route path="vpc" element={<VPCPage />} />
                <Route path="terraform" element={<TerraformPage />} />
                <Route path="topology" element={<TopologyPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all route - redirect to home (which will redirect to login if not authenticated) */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
