import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser } from '../features/auth/authSlice';
import AuthShell from '../components/layout/AuthShell';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const redirectTo = location.state?.from || '/dashboard';

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.debug('[auth] submitting login form');
      await dispatch(loginUser(form)).unwrap();
      toast.success('Login successful');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err || 'Unable to login';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your premium crypto learning workspace."
      subtitle="Resume your lessons, track your portfolio, and keep the streak engine running in a polished fintech-style dashboard."
      footerText="New here?"
      footerLinkText="Create an account"
      footerLinkTo="/register"
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Email</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
            placeholder="you@company.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>

        <label className="block space-y-2 text-sm text-slate-300">
          <span>Password</span>
          <div className="relative">
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="Your password"
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-sm font-medium text-slate-400 transition hover:text-white">
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <div className="flex items-center justify-between gap-4">
          <button className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
          <Link to="/forgot" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
            Forgot password?
          </Link>
        </div>
      </form>

      {error && <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
    </AuthShell>
  );
}