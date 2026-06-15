import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { ExtractCV } from './pages/ExtractCV';
import { Candidates } from './pages/Candidates';
import { ManageRoles } from './pages/ManageRoles';
import { ManageLevels } from './pages/ManageLevels';
import { Layout } from './components/UIComponents';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-bg-page">
        <p className="text-text-secondary font-semibold animate-pulse text-sm">Authenticating Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!loading && user ? <Navigate to="/extract" replace /> : <Login />}
      />
      <Route
        path="/extract"
        element={
          <ProtectedRoute>
            <ExtractCV />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidates"
        element={
          <ProtectedRoute>
            <Candidates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <ManageRoles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/levels"
        element={
          <ProtectedRoute>
            <ManageLevels />
          </ProtectedRoute>
        }
      />
      {/* Defaults */}
      <Route path="/" element={<Navigate to="/extract" replace />} />
      <Route path="*" element={<Navigate to="/extract" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};
