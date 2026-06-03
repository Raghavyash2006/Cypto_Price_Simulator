import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const location = useLocation();
  const { token, user, isBootstrapping } = useSelector((state) => state.auth);

  if (isBootstrapping) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">Loading session…</div>;
  }

  if (!token && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
