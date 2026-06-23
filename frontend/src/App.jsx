import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Login from './pages/Login';
import RecoveryPass from './pages/RecoveryPass';
import RequestReset from './pages/RequestReset';
import ResetPassword from './pages/ResetPassword';
import UserProfile from './pages/UserProfile';
import LiveStream from './pages/LiveStream';
import FaceRegistration from './pages/FaceRegistration';
import Cameras from './pages/Cameras';
import CameraForm from './pages/CameraForm';
import HomeDash from './pages/HomeDash';
import Reports from './pages/Reports';
import MainLayout from './components/MainLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/recovery" element={<RecoveryPass />} />
            <Route path="/request-password-reset" element={<RequestReset />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<HomeDash />} />
              <Route path="/live" element={<LiveStream />} />
              <Route path="/faces" element={<FaceRegistration />} />
              <Route path="/cameras" element={<Cameras />} />
              <Route path="/cameras/new" element={<CameraForm />} />
              <Route path="/cameras/edit/:id" element={<CameraForm />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<UserProfile />} />
            </Route>
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            theme="colored"
          />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
