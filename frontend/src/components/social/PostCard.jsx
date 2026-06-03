import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function PostCard({ post, onLike, onComment }) {
  const [comment, setComment] = useState('');
  const authorName = post.author?.name || post.author?.username || 'Community member';

  const submitComment = async (event) => {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;
    await onComment?.(post._id, trimmed);
    setComment('');
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.9)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 font-black text-slate-950">
          {(authorName || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/profile/${post.author?.username}`} className="font-semibold text-white hover:text-cyan-200">
              {authorName}
            </Link>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{post.visibility}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">{post.content}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {(post.tags || []).map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onLike?.(post._id)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            post.likedByViewer ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : 'border-white/10 bg-white/5 text-slate-200'
          }`}
        >
          ♥ {post.likesCount || 0}
        </button>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
          {post.commentsCount || 0} comments
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Recent comments</div>
        <div className="space-y-3">
          {(post.comments || []).length === 0 ? (
            <div className="text-sm text-slate-400">No comments yet.</div>
          ) : (
            post.comments.map((comment) => (
              <div key={comment._id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <div className="text-xs font-semibold text-white">{comment.author?.name || comment.author?.username}</div>
                <div className="mt-1 text-sm text-slate-300">{comment.content}</div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={submitComment} className="flex gap-2">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment"
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
          >
            Reply
          </button>
        </form>
      </div>
    </motion.article>
  );
}

export default memo(PostCard);
