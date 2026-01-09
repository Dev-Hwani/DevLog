import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PATHS, buildPath } from '../routes/paths';
import { PAGE_SIZE } from '../constants/listDefaults';
import { buildSearchParams } from '../utils/queryParams';

const Topbar = ({ theme, onToggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (location.pathname !== ROUTE_PATHS.search) {
      return;
    }
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get('query') || '');
  }, [location.pathname, location.search]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (query) {
      const params = buildSearchParams(new URLSearchParams(), {
        query,
        page: 1,
        size: PAGE_SIZE,
      });
      navigate(`${ROUTE_PATHS.search}?${params.toString()}`);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to={ROUTE_PATHS.home} className="brand">
          <span className="brand__logo">velog</span>
          <span className="brand__tagline">개발 로그 네트워크</span>
        </Link>
        <nav className="nav">
          <NavLink className="nav__link" to={ROUTE_PATHS.home}>
            홈
          </NavLink>
          <NavLink className="nav__link" to={ROUTE_PATHS.trending}>
            트렌딩
          </NavLink>
          <NavLink className="nav__link" to={ROUTE_PATHS.following}>
            팔로잉
          </NavLink>
          <NavLink className="nav__link" to={ROUTE_PATHS.editor}>
            글쓰기
          </NavLink>
        </nav>
        <div className="topbar__actions">
          <form className="search" onSubmit={handleSearch}>
            <span className="search__icon">S</span>
            <input
              className="search__input"
              placeholder="글 검색"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </form>
          <button type="button" className="button button--ghost theme-toggle" onClick={onToggleTheme}>
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
          {user ? (
            <>
              <Link to={buildPath.profile(user.id)} className="button button--ghost">
                프로필
              </Link>
              <button type="button" className="button button--ghost" onClick={() => logout()}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to={ROUTE_PATHS.login} className="button button--ghost">
                로그인
              </Link>
              <Link to={ROUTE_PATHS.signup} className="button button--solid">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
