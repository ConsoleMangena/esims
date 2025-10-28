import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState("surveyor");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const isStrong = (pw: string) => pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (!username.trim()) {
        setError("Username is required");
        return;
      }
      if (!email.trim()) {
        setError("Email is required");
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
        setError("Enter a valid email address");
        return;
      }
      if (!isStrong(password)) {
        setError("Password must be at least 12 chars with uppercase, lowercase, a digit, and a special character");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!isChecked) {
        setError("Please accept the Terms and Privacy Policy");
        return;
      }
      const res = await api.post("auth/register", { username, email, password, role });
      const access = res.data?.access;
      const refresh = res.data?.refresh;
      const returnedRole = res.data?.user?.role ?? role ?? null;
      if (!access || !refresh) throw new Error("Invalid token response");
      login(access, refresh, returnedRole);
      navigate("/", { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data;
      let msg = "Registration failed";
      if (typeof detail === "string") {
        msg = detail;
      } else if (detail?.detail) {
        msg = detail.detail;
      } else if (detail && typeof detail === "object") {
        // Flatten field errors: {field: ["msg1", "msg2"]}
        const parts = Object.entries(detail as Record<string, any>)
          .map(([k, v]) => `${k}: ${(Array.isArray(v) ? v.join(", ") : String(v))}`);
        if (parts.length) msg = parts.join("; ");
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10"></div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-lg sm:text-xl dark:text-white/90">
              Create account
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Join ESIMS
            </p>
          </div>
          <div>
            <form onSubmit={onSubmit}>
              <div className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <Label>
                      Username<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="username"
                      name="username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e:any)=>setUsername(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label>
                      Role
                    </Label>
                    <select
                      className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      value={role}
                      onChange={(e)=>setRole(e.target.value)}
                    >
                      <option value="surveyor">Surveyor</option>
                      <option value="manager">Manager</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e:any)=>{setEmail(e.target.value); setEmailErr(null);}}
                    error={!!emailErr}
                    hint={emailErr || undefined}
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>Password<span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input
                      placeholder="password"
                      type={showPassword ? "text" : "password"}
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
                  <ul className="mt-2 text-xs text-gray-500 space-y-1">
                    <li className={password.length >= 12 ? "text-success-500" : ""}>• At least 12 characters</li>
                    <li className={/[A-Z]/.test(password) ? "text-success-500" : ""}>• At least one uppercase letter</li>
                    <li className={/[a-z]/.test(password) ? "text-success-500" : ""}>• At least one lowercase letter</li>
                    <li className={/\d/.test(password) ? "text-success-500" : ""}>• At least one digit</li>
                    <li className={/[^A-Za-z0-9]/.test(password) ? "text-success-500" : ""}>• At least one special character</li>
                  </ul>
                </div>
                {/* <!-- Confirm Password --> */}
                <div>
                  <Label>Confirm Password<span className="text-error-500">*</span></Label>
                  <div className="relative">
                    <Input
                      placeholder="confirm password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e:any)=>setConfirmPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-3 top-1/2"
                    >
                      {showConfirm ? (
                        <EyeIcon className="size-5 text-gray-500" />
                      ) : (
                        <EyeCloseIcon className="size-5 text-gray-500" />
                      )}
                    </span>
                  </div>
                </div>
                {/* <!-- Checkbox --> */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block text-xs text-gray-500 dark:text-gray-400">
                    I agree to the Terms and Privacy Policy
                  </p>
                </div>
                {/* <!-- Button --> */}
                <div>
                  {error && (
                    <p className="mb-3 text-sm text-error-500">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || !username.trim() || !email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || !isStrong(password) || password !== confirmPassword || !isChecked}
                    className={`flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg ${
                      loading || !username.trim() || !email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || !isStrong(password) || password !== confirmPassword || !isChecked
                        ? "bg-brand-400 cursor-not-allowed opacity-60"
                        : "bg-brand-500 hover:bg-brand-600"
                    }`}
                    aria-busy={loading}
                  >
                    {loading ? "Signing up..." : "Sign Up"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account? {""}
                <Link
                  to="/login"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
