import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post("auth/login", { username, password });
      const access = res.data?.access;
      const refresh = res.data?.refresh;
      if (!access || !refresh) throw new Error("Invalid token response");
      // fetch role using fresh access token to avoid race with storage
      const me = await api.get("users/profiles/me/", {
        headers: { Authorization: `Bearer ${access}` },
      });
      const role = me.data?.role ?? null;
      login(access, refresh, role);
      navigate("/", { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) setError("Incorrect username or password");
      else if (status === 429) setError("Too many attempts. Please wait and try again.");
      else setError(err?.response?.data?.detail || "Sign-in failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto"></div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-lg sm:text-xl dark:text-white/90">
              Sign in
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Access your account
            </p>
          </div>
          <div>
            <form onSubmit={onSubmit}>
              <div className="space-y-5">
                <div>
                  <Label>Username<span className="text-error-500">*</span></Label>
                  <Input placeholder="username" value={username} onChange={(e:any)=>setUsername(e.target.value)} />
                </div>
                <div>
                  <Label>Password<span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="password"
                      value={password}
                      onChange={(e:any)=>setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-3 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="size-5 text-gray-500" />
                      ) : (
                        <EyeCloseIcon className="size-5 text-gray-500" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span />
                  <Link to="/reset-password" className="text-sm text-brand-500 hover:text-brand-600">
                    Forgot password?
                  </Link>
                </div>
                <div>
                  {error && <p className="mb-3 text-sm text-error-500">{error}</p>}
                  <button type="submit" className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600">
                    Sign in
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Don&apos;t have an account? {""}
                <Link
                  to="/register"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
