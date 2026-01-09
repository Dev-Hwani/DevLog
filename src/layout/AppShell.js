import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppRoutes from '../routes/AppRoutes';
import { subscribeEvents } from '../api/eventBus';
import { ROUTE_PATHS } from '../routes/paths';
import Topbar from '../components/Topbar';
import Footer from '../components/Footer';
import GlobalNotice from '../components/GlobalNotice';

const AppShell = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();
  const queryCache = useQueryClient();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = subscribeEvents((event) => {
      if (event.type === 'error') {
        setNotice({ type: 'error', message: event.message });
        return;
      }
      if (event.type === 'auth-expired') {
        queryCache.setQueryData(['me'], null);
        setNotice({ type: 'error', message: 'Session expired. Please log in again.' });
        navigate(ROUTE_PATHS.login, { replace: true });
      }
    });
    return unsubscribe;
  }, [navigate, queryCache]);

  return (
    <div className="app">
      <Topbar theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <GlobalNotice notice={notice} onClose={() => setNotice(null)} />
      <main className="main">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
};

export default AppShell;
