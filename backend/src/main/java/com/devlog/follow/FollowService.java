package com.devlog.follow;

import com.devlog.common.PageResponse;
import com.devlog.domain.Follow;
import com.devlog.domain.User;
import com.devlog.follow.dto.FollowResponse;
import com.devlog.repository.FollowRepository;
import com.devlog.repository.UserRepository;
import com.devlog.security.UserPrincipal;
import com.devlog.user.dto.UserSummary;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FollowService {
    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    @Transactional
    public void followUser(Long targetId, UserPrincipal principal) {
        User follower = getCurrentUser(principal);
        if (follower.getId().equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot follow yourself");
        }
        User target = getUser(targetId);
        if (followRepository.existsByFollowerIdAndFollowingId(follower.getId(), targetId)) {
            return;
        }
        Follow follow = new Follow();
        follow.setFollower(follower);
        follow.setFollowing(target);
        followRepository.save(follow);
    }

    @Transactional
    public void unfollowUser(Long targetId, UserPrincipal principal) {
        User follower = getCurrentUser(principal);
        followRepository.findByFollowerIdAndFollowingId(follower.getId(), targetId)
            .ifPresent(followRepository::delete);
    }

    public PageResponse<FollowResponse> listFollowers(Long userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Follow> result = followRepository.findByFollowingId(userId, pageable);
        Page<FollowResponse> mapped = result.map(follow ->
            new FollowResponse(UserSummary.from(follow.getFollower()), follow.getCreatedAt())
        );
        return PageResponse.from(mapped);
    }

    public PageResponse<FollowResponse> listFollowing(Long userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Follow> result = followRepository.findByFollowerId(userId, pageable);
        Page<FollowResponse> mapped = result.map(follow ->
            new FollowResponse(UserSummary.from(follow.getFollowing()), follow.getCreatedAt())
        );
        return PageResponse.from(mapped);
    }

    public List<Long> getFollowingIds(Long followerId) {
        return followRepository.findFollowingIds(followerId);
    }

    private User getCurrentUser(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return getUser(principal.getId());
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
