import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function RoleRedirect() {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  const target =
    role === "surveyor"
      ? "/surveyor"
      : role === "manager"
      ? "/manager"
      : role === "client"
      ? "/client"
      : "/admin";
  return <Navigate to={target} replace />;
}