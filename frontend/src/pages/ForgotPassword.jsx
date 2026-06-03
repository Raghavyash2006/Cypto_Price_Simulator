import { useState } from 'react';
import apiClient from '../services/apiClient';
import AuthShell from '../components/layout/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await apiClient.post('/auth/forgot', { email });
      setMessage(data.message || 'If that email exists we sent a reset link');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Unable to request reset');
    }
    setLoading(false);
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset access with a premium recovery flow."
      subtitle="We’ll send a secure reset link so you can get back to your lessons and portfolio without friction."
      footerText="Remembered your password?"
      footerLinkText="Back to sign in"
      footerLinkTo="/login"
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Email</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {message && <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>}
    </AuthShell>
  );
}
