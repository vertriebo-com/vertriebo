import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Tasks from './pages/Tasks';
import Statistics from './pages/Statistics';
import Import from './pages/Import';
import BlacklistPage from './pages/BlacklistPage';
import SettingsPage from './pages/SettingsPage';
import MapView from './pages/MapView';
import Documents from './pages/Documents';
import CalendarView from './pages/CalendarView';
import DuplicatesPage from './pages/DuplicatesPage';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';

const AnimatedRoutes = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        className="contents"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<AnimatedRoutes><Dashboard /></AnimatedRoutes>} />
        <Route path="/leads" element={<AnimatedRoutes><Leads /></AnimatedRoutes>} />
        <Route path="/leads/:id" element={<AnimatedRoutes><LeadDetail /></AnimatedRoutes>} />
        <Route path="/tasks" element={<AnimatedRoutes><Tasks /></AnimatedRoutes>} />
        <Route path="/statistics" element={<AnimatedRoutes><Statistics /></AnimatedRoutes>} />
        <Route path="/import" element={<AnimatedRoutes><Import /></AnimatedRoutes>} />
        <Route path="/blacklist" element={<AnimatedRoutes><BlacklistPage /></AnimatedRoutes>} />
        <Route path="/settings" element={<AnimatedRoutes><SettingsPage /></AnimatedRoutes>} />
        <Route path="/map" element={<AnimatedRoutes><MapView /></AnimatedRoutes>} />
        <Route path="/documents" element={<AnimatedRoutes><Documents /></AnimatedRoutes>} />
        <Route path="/calendar" element={<AnimatedRoutes><CalendarView /></AnimatedRoutes>} />
        <Route path="/duplicates" element={<AnimatedRoutes><DuplicatesPage /></AnimatedRoutes>} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
      {/* Public pages - outside layout */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
    </Routes>
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
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App