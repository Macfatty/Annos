/**
 * RequireAuth Component
 *
 * Route guard that redirects to login if not authenticated
 * or to home if user doesn't have required role.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.role] - Required role (optional)
 */

import PropTypes from "prop-types";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

function RequireAuth({ role }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, save attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    // User doesn't have required role
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has correct role
  return <Outlet />;
}

RequireAuth.propTypes = {
  role: PropTypes.string,
};

export default RequireAuth;
