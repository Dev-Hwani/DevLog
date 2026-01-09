import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { ROUTE_PATHS } from '../routes/paths';

const NotFoundPage = () => (
  <EmptyState
    title="페이지를 찾을 수 없어요"
    message="요청한 페이지가 존재하지 않아요."
    action={
      <Link to={ROUTE_PATHS.home} className="button button--solid">
        홈으로 돌아가기
      </Link>
    }
  />
);

export default NotFoundPage;
