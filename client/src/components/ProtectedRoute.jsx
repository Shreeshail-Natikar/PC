import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-whatsapp-panelLight dark:bg-whatsapp-panel text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
