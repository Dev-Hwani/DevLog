import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../routes/paths';

const Footer = () => (
  <footer className="footer">
    <span>개발자를 위한 DevLog 클론. 긴 기술 글을 기록하기 좋게 만들었어요.</span>
    <div className="footer__links">
      <Link to={ROUTE_PATHS.home}>문서</Link>
      <Link to={ROUTE_PATHS.trending}>트렌딩</Link>
      <Link to={ROUTE_PATHS.following}>팔로잉</Link>
    </div>
  </footer>
);

export default Footer;
