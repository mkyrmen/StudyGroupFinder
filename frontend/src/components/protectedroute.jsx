import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ isAuthenticated, user, requiredRole, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
