import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { PortfolioMonitor } from './pages/PortfolioMonitor';
import { StockAnalyzer } from './pages/StockAnalyzer';
import { AlphaEdgeEvaluator } from './pages/AlphaEdgeEvaluator';
import { Settings } from './pages/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/portfolio"
            element={
              <ProtectedRoute>
                <PortfolioMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/analyzer"
            element={
              <ProtectedRoute>
                <StockAnalyzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/evaluator"
            element={
              <ProtectedRoute>
                <AlphaEdgeEvaluator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
