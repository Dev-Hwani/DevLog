import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from '../context/AuthContext';
import { ROUTE_PATHS } from './paths';
import HomePage from '../pages/HomePage';
import TrendingPage from '../pages/TrendingPage';
import FollowingPage from '../pages/FollowingPage';
import TagPage from '../pages/TagPage';
import SearchPage from '../pages/SearchPage';
import ArticleDetailPage from '../pages/ArticleDetailPage';
import EditorPage from '../pages/EditorPage';
import ProfilePage from '../pages/ProfilePage';
import AuthPage from '../pages/AuthPage';
import NotFoundPage from '../pages/NotFoundPage';

const AppRoutes = () => (
  <Routes>
    <Route path={ROUTE_PATHS.home} element={<HomePage />} />
    <Route path={ROUTE_PATHS.trending} element={<TrendingPage />} />
    <Route
      path={ROUTE_PATHS.following}
      element={
        <RequireAuth>
          <FollowingPage />
        </RequireAuth>
      }
    />
    <Route path={ROUTE_PATHS.tag} element={<TagPage />} />
    <Route path={ROUTE_PATHS.search} element={<SearchPage />} />
    <Route path={ROUTE_PATHS.article} element={<ArticleDetailPage />} />
    <Route
      path={ROUTE_PATHS.editor}
      element={
        <RequireAuth>
          <EditorPage />
        </RequireAuth>
      }
    />
    <Route
      path={ROUTE_PATHS.editorEdit}
      element={
        <RequireAuth>
          <EditorPage />
        </RequireAuth>
      }
    />
    <Route path={ROUTE_PATHS.profile} element={<ProfilePage />} />
    <Route path={ROUTE_PATHS.login} element={<AuthPage mode="login" />} />
    <Route path={ROUTE_PATHS.signup} element={<AuthPage mode="signup" />} />
    <Route path={ROUTE_PATHS.notFound} element={<NotFoundPage />} />
  </Routes>
);

export default AppRoutes;
