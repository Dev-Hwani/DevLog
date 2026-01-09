import React, { useContext, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, login as loginRequest, logout as logoutRequest, signup as signupRequest } from '../api/auth';
import { ROUTE_PATHS } from '../routes/paths';

const AuthContext = React.createContext(null);

export const AuthProvider = ({ children }) => {
  const queryCache = useQueryClient();
  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      queryCache.setQueryData(['me'], data);
    },
  });

  const signupMutation = useMutation({
    mutationFn: signupRequest,
    onSuccess: (data) => {
      queryCache.setQueryData(['me'], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryCache.setQueryData(['me'], null);
    },
  });

  const value = useMemo(
    () => ({
      user: meQuery.data || null,
      isLoading: meQuery.isLoading,
      login: loginMutation.mutateAsync,
      signup: signupMutation.mutateAsync,
      logout: logoutMutation.mutateAsync,
    }),
    [
      meQuery.data,
      meQuery.isLoading,
      loginMutation.mutateAsync,
      signupMutation.mutateAsync,
      logoutMutation.mutateAsync,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider is missing');
  }
  return ctx;
};

export const RequireAuth = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="card">불러오는 중...</div>;
  }
  if (!user) {
    return <Navigate to={ROUTE_PATHS.login} replace state={{ from: location }} />;
  }
  return children;
};
