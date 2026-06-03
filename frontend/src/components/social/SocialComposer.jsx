import { memo, useState } from 'react';

const visibilities = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers' },
  { value: 'friends', label: 'Friends' }
];

function SocialComposer({ onSubmit, loading = false }) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    await onSubmit?.({ content: trimmed, visibility });
    setContent('');
    setVisibility('public');
  };

  return (
    <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-5 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.85)]">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-lg font-black text-slate-950">+</div>
        <div className="flex-1">
          <textarea
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share a market take, win, lesson, or strategy question..."
            className="w-full resize-none rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {visibilities.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVisibility(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    visibility === option.value
                      ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Posting…' : 'Post update'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default memo(SocialComposer);
