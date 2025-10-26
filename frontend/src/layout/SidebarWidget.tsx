import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function SidebarWidget() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  if (!role) return null;

  const profilePath = role === "surveyor"
    ? "/surveyor/profile"
    : role === "manager"
    ? "/manager/profile"
    : role === "client"
    ? "/client/profile"
    : "/admin/profile";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={profilePath}
          className="text-xs font-medium text-gray-700 hover:text-brand-600 dark:text-gray-300"
        >
          View profile
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs px-2 py-1 rounded bg-error-500 text-white hover:bg-error-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
