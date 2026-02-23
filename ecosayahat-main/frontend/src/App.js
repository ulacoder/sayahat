import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { RegionSelection } from './pages/RegionSelection';
import { TouristDashboard } from './pages/TouristDashboard';
import { TaxiDriverDashboard } from './pages/TaxiDriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AIAssistant } from './components/AIAssistant';
import './i18n';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <RegionSelection />
          </ProtectedRoute>
        } />
        <Route path="/tourist/:regionId" element={
          <ProtectedRoute>
            <TouristDashboard />
          </ProtectedRoute>
        } />
        <Route path="/taxi" element={
          <ProtectedRoute>
            <TaxiDriverDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
      {user && <AIAssistant />}
      <Toaster position="top-right" richColors />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;