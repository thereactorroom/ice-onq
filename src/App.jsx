import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import IframeDetector from './components/IframeDetector';
import { isInFusionIframe } from '@/lib/fusionBridge';

// Eagerly load ProfileView — it's the primary page (iframe entry point)
import ProfileView from './pages/ProfileView';

// Lazy-load all other pages to reduce initial JS payload
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ManageContacts = lazy(() => import('./pages/ManageContacts'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const SharingView = lazy(() => import('./pages/SharingView'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

const AuthenticatedApp = () => {
  // Hooks must always be called first — no early returns before this
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();

  // Redirect Fusion iframe URLs (/?fID=...&UserName=...) to /profile immediately
  const fusionParams = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/' && fusionParams.get('fID')) {
    window.location.replace(`/profile${window.location.search}`);
    return null;
  }

  // Resolve QR-code path URLs: https://ice.onq.life/{32-char-token} → /profile?qrToken=...
  const knownRoutes = ['/profile', '/login', '/register', '/forgot-password', '/reset-password', '/contacts', '/medical', '/wallet-card'];
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  if (pathSegments.length === 1 && !knownRoutes.includes(window.location.pathname)) {
    const seg = pathSegments[0];
    if (/^[A-Za-z0-9_-]{32}$/.test(seg)) {
      window.location.replace(`/profile?qrToken=${seg}`);
      return null;
    }
  }

  // Detect fusiononq iframe — skip loading gate for optimistic UI
  // Uses isInFusionIframe() with sessionStorage caching so the detection
  // survives internal navigations (document.referrer changes after navigation)
  const isFusionIframe = isInFusionIframe();

  // Show loading spinner while checking app public settings or auth
  // (skipped for fusiononq iframes — optimistic UI)
  if (!isFusionIframe && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Only block for unregistered users — no forced login redirects
  // (skipped for fusiononq iframes)
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

          <Route path="/profile" element={<ProfileView key={location.pathname + location.search} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="/contacts" element={<ManageContacts />} />
            <Route path="/medical" element={<EditProfile />} />
            <Route path="/wallet-card" element={<SharingView />} />
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