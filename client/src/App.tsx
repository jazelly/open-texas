import { Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

// Pages
import HomePage from './pages/HomePage';
import GamePage from './pages/game';
import LobbyPage from './pages/LobbyPage';
import RulesPage from './pages/RulesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import { AuthProvider, useAuthContext } from './context';


// Protected route component
interface ProtectedRouteProps {
  children: ReactNode;
  allowPublicAccess?: boolean; // For routes like GamePage that can allow access via state
}

const ProtectedRoute = ({ children, allowPublicAccess = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  
  // Don't render anything while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  // If user is not authenticated and the route doesn't allow public access, redirect to home
  if (!isAuthenticated && !allowPublicAccess) {
    return <Navigate to="/" replace />;
  }
  
  // User is authenticated or the route allows public access, render the component
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby" element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          } />
          <Route path="/game/:gameId" element={
            <ProtectedRoute allowPublicAccess={true}>
              <GamePage />
            </ProtectedRoute>
          } />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App; 