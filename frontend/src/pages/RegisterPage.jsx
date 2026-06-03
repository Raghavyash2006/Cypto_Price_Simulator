import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerUser } from '../features/auth/authSlice';
import AuthShell from '../components/layout/AuthShell';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', referralCode: '' });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const redirectTo = location.state?.from || '/dashboard';

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.debug('[auth] submitting register form');
      await dispatch(registerUser(form)).unwrap();
      toast.success('Account created successfully');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err || 'Unable to register';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Join the premium crypto simulator and start learning with momentum."
      subtitle="Create your account, claim a virtual balance, and enter a polished product experience built around growth and competition."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form className="space-y-4" onSubmit={submit}>
        {[
          ['Username', 'username', 'Username'],
          ['Full name', 'name', 'Full name'],
          ['Email', 'email', 'Email']
        ].map(([label, key, placeholder]) => (
          <label key={key} className="block space-y-2 text-sm text-slate-300">
            <span>{label}</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
              placeholder={placeholder}
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </label>
        ))}

        <label className="block space-y-2 text-sm text-slate-300">
          <span>Referral code</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
            placeholder="Optional referral code"
            value={form.referralCode}
            onChange={(event) => setForm({ ...form, referralCode: event.target.value })}
          />
        </label>

        <label className="block space-y-2 text-sm text-slate-300">
          <span>Password</span>
          <div className="relative">
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="Create a password"
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-sm font-medium text-slate-400 transition hover:text-white">
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]" disabled={loading}>
          {loading ? 'Creating…' : 'Register'}
        </button>
      </form>

      {error && <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
    </AuthShell>
  );
}