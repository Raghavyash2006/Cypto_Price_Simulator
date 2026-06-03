import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SearchBar({ value, onChange, onSearch, onClear, placeholder = 'Search coins by name or symbol...' }) {
  const [q, setQ] = useState('');
  const isControlled = typeof value !== 'undefined';
  const currentValue = isControlled ? value : q;

  const submit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(currentValue);
    }
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (!isControlled) {
      setQ(nextValue);
    }
    onChange?.(nextValue);
  };

  return (
    <form onSubmit={submit} className="glass-panel flex w-full flex-col gap-3 rounded-[1.75rem] p-3 sm:flex-row sm:items-center">
      <input
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/20"
      />
      <div className="flex gap-2">
        {currentValue && onClear ? (
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClear}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Clear
          </motion.button>
        ) : null}
        {onSearch ? (
          <motion.button
            type="submit"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]"
          >
            Search
          </motion.button>
        ) : null}
      </div>
    </form>
  );
}
