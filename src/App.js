import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import AppShell from './layout/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
