import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUserProfile,
  listUserArticles,
  listUserLikes,
  listUserViews,
  updateMeProfile,
  updateProfileImage,
} from '../api/users';
import { followUser, listFollowers, listFollowing, unfollowUser } from '../api/follows';
import ArticleList from '../components/ArticleList';
import EmptyState from '../components/EmptyState';
import FollowList from '../components/FollowList';
import Pagination from '../components/Pagination';
import { SORT_OPTIONS } from '../constants/listDefaults';
import { useAuth } from '../context/AuthContext';
import { useListParams } from '../hooks/useListParams';
import { ROUTE_PATHS } from '../routes/paths';
import { formatDate, getInitials } from '../utils/format';
import { buildSearchParams } from '../utils/queryParams';
import { buildImageUrl, validateImageFile } from '../utils/images';
import { getErrorMessage } from '../utils/requests';

const PROFILE_TABS = [
  { value: 'posts', label: '글' },
  { value: 'likes', label: '좋아요' },
  { value: 'views', label: '내가 본 글', meOnly: true },
  { value: 'followers', label: '팔로워' },
  { value: 'following', label: '팔로잉' },
];

const ProfilePage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const { user } = useAuth();
  const isMe = user && user.id === userId;
  const navigate = useNavigate();
  const queryCache = useQueryClient();
  const { page, size, sort, setPage, setSort, searchParams, setSearchParams } = useListParams();
  const sortValue = SORT_OPTIONS.find((option) => option.value === sort)?.apiValue;
  const [profileForm, setProfileForm] = useState({ nickname: '', bio: '' });
  const [profileError, setProfileError] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [profileImageError, setProfileImageError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);

  const availableTabs = PROFILE_TABS.filter((tab) => !tab.meOnly || isMe);
  const tabParam = searchParams.get('tab');
  const activeTab = availableTabs.some((tab) => tab.value === tabParam) ? tabParam : 'posts';
  const isPostsTab = activeTab === 'posts';
  const isLikesTab = activeTab === 'likes';
  const isViewsTab = activeTab === 'views';
  const isFollowersTab = activeTab === 'followers';
  const isFollowingTab = activeTab === 'following';

  useEffect(() => {
    if (tabParam !== activeTab) {
      setSearchParams(buildSearchParams(searchParams, { tab: activeTab }));
    }
  }, [activeTab, searchParams, setSearchParams, tabParam]);

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getUserProfile(userId),
    enabled: Number.isFinite(userId),
  });

  const articlesQuery = useQuery({
    queryKey: ['user-articles', userId, page, size, sort],
    queryFn: () => listUserArticles(userId, { page, size, sort: sortValue }),
    enabled: Number.isFinite(userId) && isPostsTab,
  });

  const likesQuery = useQuery({
    queryKey: ['user-likes', userId, page, size],
    queryFn: () => listUserLikes(userId, { page, size }),
    enabled: Number.isFinite(userId) && isLikesTab,
  });

  const viewsQuery = useQuery({
    queryKey: ['user-views', userId, page, size],
    queryFn: () => listUserViews(userId, { page, size }),
    enabled: Number.isFinite(userId) && isViewsTab && isMe,
  });

  const followersQuery = useQuery({
    queryKey: ['user-followers', userId, page, size],
    queryFn: () => listFollowers(userId, { page, size }),
    enabled: Number.isFinite(userId) && isFollowersTab,
  });

  const followingQuery = useQuery({
    queryKey: ['user-following', userId, page, size],
    queryFn: () => listFollowing(userId, { page, size }),
    enabled: Number.isFinite(userId) && isFollowingTab,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfileForm({
        nickname: profileQuery.data.nickname || '',
        bio: profileQuery.data.bio || '',
      });
      setIsFollowing(Boolean(profileQuery.data.isFollowing));
    }
  }, [profileQuery.data]);

  useEffect(() => {
    return () => {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  const updateProfileMutation = useMutation({
    mutationFn: updateMeProfile,
    onSuccess: () => {
      queryCache.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileError('');
    try {
      await updateProfileMutation.mutateAsync(profileForm);
    } catch (error) {
      setProfileError(getErrorMessage(error));
    }
  };

  const handleProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const validation = validateImageFile(file);
    if (validation) {
      setProfileImageError(validation);
      return;
    }
    setProfileImageError('');
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }
    setProfileImagePreview(URL.createObjectURL(file));
    try {
      await updateProfileImage(file);
      queryCache.invalidateQueries({ queryKey: ['profile', userId] });
    } catch (error) {
      setProfileImageError(getErrorMessage(error));
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate(ROUTE_PATHS.login);
      return;
    }
    if (isFollowing) {
      await unfollowUser(userId);
      setIsFollowing(false);
    } else {
      await followUser(userId);
      setIsFollowing(true);
    }
    queryCache.invalidateQueries({ queryKey: ['profile', userId] });
    queryCache.invalidateQueries({ queryKey: ['user-followers', userId] });
    if (user?.id) {
      queryCache.invalidateQueries({ queryKey: ['user-following', user.id] });
    }
  };

  const handleTabChange = (nextTab) => {
    setSearchParams(buildSearchParams(searchParams, { tab: nextTab, page: 1 }));
  };

  const profile = profileQuery.data;
  const profileImage = profileImagePreview || buildImageUrl(profile?.profileImageUrl);
  const totalPages = isPostsTab
    ? articlesQuery.data?.totalPages ?? 0
    : isLikesTab
      ? likesQuery.data?.totalPages ?? 0
      : isViewsTab
        ? viewsQuery.data?.totalPages ?? 0
        : isFollowersTab
          ? followersQuery.data?.totalPages ?? 0
          : isFollowingTab
            ? followingQuery.data?.totalPages ?? 0
            : 0;

  const renderTabContent = () => {
    if (isPostsTab) {
      if (articlesQuery.isLoading) {
        return <div className="card">글을 불러오는 중...</div>;
      }
      if (articlesQuery.isError) {
        return (
          <EmptyState title="글을 불러올 수 없어요" message={getErrorMessage(articlesQuery.error)} />
        );
      }
      return (
        <ArticleList
          items={articlesQuery.data?.items || []}
          emptyTitle="작성한 글이 없어요"
          emptyMessage="첫 글을 작성해보세요."
        />
      );
    }

    if (isLikesTab) {
      if (likesQuery.isLoading) {
        return <div className="card">좋아요 목록을 불러오는 중...</div>;
      }
      if (likesQuery.isError) {
        return (
          <EmptyState title="좋아요 목록을 불러올 수 없어요" message={getErrorMessage(likesQuery.error)} />
        );
      }
      return (
        <ArticleList
          items={likesQuery.data?.items || []}
          emptyTitle="좋아요한 글이 없어요"
          emptyMessage="마음에 드는 글을 좋아요 해보세요."
        />
      );
    }

    if (isViewsTab) {
      if (viewsQuery.isLoading) {
        return <div className="card">내가 본 글을 불러오는 중...</div>;
      }
      if (viewsQuery.isError) {
        return (
          <EmptyState title="내가 본 글을 불러올 수 없어요" message={getErrorMessage(viewsQuery.error)} />
        );
      }
      return (
        <ArticleList
          items={viewsQuery.data?.items || []}
          emptyTitle="최근에 본 글이 없어요"
          emptyMessage="읽은 글이 여기에 정리돼요."
        />
      );
    }

    if (isFollowersTab) {
      if (followersQuery.isLoading) {
        return <div className="card">팔로워를 불러오는 중...</div>;
      }
      if (followersQuery.isError) {
        return (
          <EmptyState title="팔로워를 불러올 수 없어요" message={getErrorMessage(followersQuery.error)} />
        );
      }
      return (
        <FollowList
          items={followersQuery.data?.items || []}
          emptyTitle="팔로워가 아직 없어요"
          emptyMessage="공개 글을 올리면 팔로워가 늘어날 수 있어요."
        />
      );
    }

    if (isFollowingTab) {
      if (followingQuery.isLoading) {
        return <div className="card">팔로잉을 불러오는 중...</div>;
      }
      if (followingQuery.isError) {
        return (
          <EmptyState title="팔로잉을 불러올 수 없어요" message={getErrorMessage(followingQuery.error)} />
        );
      }
      return (
        <FollowList
          items={followingQuery.data?.items || []}
          emptyTitle="팔로잉한 사용자가 없어요"
          emptyMessage="관심 있는 개발자를 팔로우해보세요."
        />
      );
    }

    return null;
  };

  return (
    <section className="profile">
      {profileQuery.isLoading ? (
        <div className="card">프로필을 불러오는 중...</div>
      ) : profileQuery.isError ? (
        <EmptyState title="프로필을 불러올 수 없어요" message={getErrorMessage(profileQuery.error)} />
      ) : (
        <>
          <div className="profile__header">
            <div className="profile__avatar">
              {profileImage ? <img src={profileImage} alt="Profile" /> : getInitials(profile?.nickname || '익명')}
            </div>
            <div className="profile__info">
              <h2>{profile?.nickname || '익명'}</h2>
              <p className="article-summary">{profile?.bio || '소개가 아직 없어요.'}</p>
              <div className="profile__actions">
                {isMe ? (
                  <>
                    <label className="button button--ghost">
                      사진 변경
                      <input type="file" accept="image/png,image/jpeg" onChange={handleProfileImage} hidden />
                    </label>
                    {profileImageError && <div className="form-error">{profileImageError}</div>}
                  </>
                ) : (
                  <button type="button" className="button button--solid" onClick={handleFollow}>
                    {isFollowing ? '팔로우 해제' : '팔로우'}
                  </button>
                )}
              </div>
              <div className="profile__stats">
                <button type="button" className="profile__stat" onClick={() => handleTabChange('followers')}>
                  팔로워 {profile?.followerCount ?? 0}
                </button>
                <button type="button" className="profile__stat" onClick={() => handleTabChange('following')}>
                  팔로잉 {profile?.followingCount ?? 0}
                </button>
                <span className="profile__stat-label">
                  가입 {profile?.createdAt ? formatDate(profile.createdAt) : '최근'}
                </span>
              </div>
            </div>
          </div>
          {isMe && (
            <form className="card profile__form" onSubmit={handleProfileSave}>
              <div className="card__title">프로필 설정</div>
              <label>
                닉네임
                <input
                  value={profileForm.nickname}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, nickname: event.target.value }))
                  }
                />
              </label>
              <label>
                소개
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, bio: event.target.value }))
                  }
                />
              </label>
              {profileError && <div className="form-error">{profileError}</div>}
              <button type="submit" className="button button--solid">
                변경 저장
              </button>
            </form>
          )}
          <div className="profile__content">
            <div className="profile__tabs">
              {availableTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`tab ${activeTab === tab.value ? 'tab--active' : ''}`}
                  onClick={() => handleTabChange(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {isPostsTab && (
              <div className="profile__filters">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`tab ${sort === option.value ? 'tab--active' : ''}`}
                    onClick={() => setSort(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {renderTabContent()}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}
    </section>
  );
};

export default ProfilePage;
