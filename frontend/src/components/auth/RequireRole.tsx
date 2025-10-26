import { Navigate, useLocation } from "react-router";
import { Role, useAuth } from "../../context/AuthContext";

export default function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactElement;
}) {
  const { role } = useAuth();
  const location = useLocation();

  if (!role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!roles.includes(role)) {
    return <Navigate to="/error-404" replace />;
  }
  return children;
}