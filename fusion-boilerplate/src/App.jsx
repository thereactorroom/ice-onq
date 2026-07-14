import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import IframeDetector from './components/IframeDetector';
import { isInFusionIframe } from '@/lib/fusionBridge';

// ── Page Imports ──────────────────────────────────────────────────────────────
// Eagerly load your primary page (iframe entry point) for instant render.
// Lazy-load secondary pages to reduce initial JS payload.
import Home from './pages/Home';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// ── AuthenticatedApp ─────────────────────────────────────────────────────────
// Wraps all routes. Handles:
// - Loading states (spinner while auth/public settings load)
// - Iframe detection (skips auth gate for optimistic UI in fusion iframes)
// - Unregistered user errors
// - URL-param redirect (e.g., /?fID=123 → /home?fID=123)
const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Example: redirect Fusion iframe URLs (/?fID=...) to your main page
  const fusionParams = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/' && fusionParams.get('fID')) {
    window.location.replace(`/home${window.location.search}`);
    return null;
  }

  // Detect fusion iframe — skip loading gate for optimistic UI
  const isFusionIframe = isInFusionIframe();

  // Show loading spinner while checking app public settings or auth
  // (skipped for fusion iframes — optimistic UI)
  if (!isFusionIframe && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Only block for unregistered users — no forced login redirects
  // (skipped for fusion iframes)
  if (!isFusionIframe && authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <>
      <IframeDetector />
      <Suspense fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          {/* Auth pages — accessible without authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Authenticated pages — wrapped in Layout */}
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              {/* Add more authenticated routes here */}
            </Route>
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App