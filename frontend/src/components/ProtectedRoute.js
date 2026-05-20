import { Navigate } from 'react-router-dom';

// Decodes JWT without an external library
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

// allowedRoles: array of roles that can access the route, e.g. ['admin']
// If allowedRoles is empty, any logged-in user can access
function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem('token');

  // Not logged in → go to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const decoded = decodeToken(token);

  // Token is corrupted/expired
  if (!decoded) {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // Token is expired (exp is in seconds)
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  const role = decoded.role || 'individual';

  // If specific roles are required, check them
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to the correct dashboard based on actual role
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'provider') return <Navigate to="/provider/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
