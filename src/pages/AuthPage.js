import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PATHS } from '../routes/paths';
import { getErrorMessage } from '../utils/requests';

const AuthPage = ({ mode }) => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const isLogin = mode === 'login';
  const redirectPath = location.state?.from?.pathname || ROUTE_PATHS.home;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password });
      } else {
        await signup({ email: form.email, password: form.password, nickname: form.nickname });
      }
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <section className="auth">
      <div className="auth__card">
        <div className="auth__tabs">
          <Link to={ROUTE_PATHS.login} className={`tab ${isLogin ? 'tab--active' : ''}`}>
            로그인
          </Link>
          <Link to={ROUTE_PATHS.signup} className={`tab ${!isLogin ? 'tab--active' : ''}`}>
            회원가입
          </Link>
        </div>
        <form className="auth__form" onSubmit={handleSubmit}>
          {!isLogin && (
            <label>
              닉네임
              <input
                value={form.nickname}
                onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
                placeholder="devloger"
              />
            </label>
          )}
          <label>
            이메일
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@example.com"
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="비밀번호"
            />
          </label>
          {formError && <div className="form-error">{formError}</div>}
          <button type="submit" className="button button--solid">
            {isLogin ? '로그인' : '계정 만들기'}
          </button>
        </form>
        <div className="auth__divider">또는 다음으로 계속</div>
        <a className="button button--ghost auth__provider" href={`${API_BASE_URL}/oauth2/authorization/google`}>
          Google
        </a>
        <a className="button button--ghost auth__provider" href={`${API_BASE_URL}/oauth2/authorization/github`}>
          GitHub
        </a>
      </div>
    </section>
  );
};

export default AuthPage;
