import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LearnDashboardPage = lazy(() => import('./pages/LearnDashboardPage'));
const LearnCoursePage = lazy(() => import('./pages/LearnCoursePage'));
const LearnLessonPage = lazy(() => import('./pages/LearnLessonPage'));
const LearnAnalyticsPage = lazy(() => import('./pages/LearnAnalyticsPage'));
const LearnQuizPage = lazy(() => import('./pages/LearnQuizPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const MarketAlertsPage = lazy(() => import('./pages/MarketAlertsPage'));
const CoinDetailPage = lazy(() => import('./pages/CoinDetailPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const LiveChatPage = lazy(() => import('./pages/LiveChatPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ArenaPage = lazy(() => import('./pages/ArenaPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TradePage = lazy(() => import('./pages/TradePage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-[45vh] place-items-center px-6 text-center text-[color:var(--page-muted)]">
      <div className="glass-panel rounded-[2rem] px-6 py-5 text-sm">Loading route…</div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot" element={<ForgotPassword />} />
          <Route path="reset" element={<ResetPassword />} />
          <Route path="profile/:username" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="trade"
            element={
              <ProtectedRoute>
                <TradePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="portfolio"
            element={
              <ProtectedRoute>
                <PortfolioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="learn"
            element={
              <ProtectedRoute>
                <LearnDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="learn/course/:id"
            element={
              <ProtectedRoute>
                <LearnCoursePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="learn/lesson/:id"
            element={
              <ProtectedRoute>
                <LearnLessonPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="learn/analytics"
            element={
              <ProtectedRoute>
                <LearnAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="learn/quiz"
            element={
              <ProtectedRoute>
                <LearnQuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="quizzes"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="market"
            element={
              <ProtectedRoute>
                <MarketPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="market/coin/:id"
            element={
              <ProtectedRoute>
                <CoinDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="market/alerts"
            element={
              <ProtectedRoute>
                <MarketAlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="watchlist"
            element={
              <ProtectedRoute>
                <WatchlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="community"
            element={
              <ProtectedRoute>
                <CommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="arena"
            element={
              <ProtectedRoute>
                <ArenaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="chat"
            element={
              <ProtectedRoute>
                <LiveChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/redirect" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}