import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';
import { buildPath } from '../routes/paths';
import { buildImageUrl } from '../utils/images';
import { formatDate, getInitials } from '../utils/format';

const FollowList = ({ items, emptyTitle, emptyMessage }) => {
  if (!items || items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="user-list">
      {items.map((item) => {
        const profileImage = buildImageUrl(item.user?.profileImageUrl);
        return (
          <div key={`${item.user?.id}-${item.followedAt || 'follow'}`} className="user-card">
            <div className="user-card__main">
              <div className="user-avatar">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" />
                ) : (
                  getInitials(item.user?.nickname || '익명')
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{item.user?.nickname || '익명'}</div>
                {item.followedAt && (
                  <div className="user-meta">{formatDate(item.followedAt)}부터</div>
                )}
              </div>
            </div>
            <Link to={buildPath.profile(item.user?.id)} className="button button--ghost">
              프로필 보기
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default FollowList;
