package com.devlog.user;

import com.devlog.common.ImageValidator;
import com.devlog.domain.User;
import com.devlog.repository.FollowRepository;
import com.devlog.repository.UserRepository;
import com.devlog.security.UserPrincipal;
import com.devlog.user.dto.UserProfileResponse;
import com.devlog.user.dto.UserUpdateRequest;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final FollowRepository followRepository;

    public UserProfileResponse getProfile(Long userId, UserPrincipal principal) {
        User user = getUser(userId);
        boolean includeEmail = principal != null && principal.getId().equals(userId);
        return UserProfileResponse.from(
            user,
            includeEmail,
            followRepository.countByFollowingId(userId),
            followRepository.countByFollowerId(userId),
            principal != null && !principal.getId().equals(userId)
                && followRepository.existsByFollowerIdAndFollowingId(principal.getId(), userId)
        );
    }

    public UserProfileResponse getMe(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        User user = getUser(principal.getId());
        return UserProfileResponse.from(
            user,
            true,
            followRepository.countByFollowingId(user.getId()),
            followRepository.countByFollowerId(user.getId()),
            false
        );
    }

    public void updateProfile(UserPrincipal principal, UserUpdateRequest request) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        User user = getUser(principal.getId());
        user.setNickname(request.nickname());
        user.setBio(request.bio());
        userRepository.save(user);
    }

    public void updateProfileImage(UserPrincipal principal, MultipartFile file) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        ImageValidator.validateImage(file);
        User user = getUser(principal.getId());
        try {
            user.setProfileImage(file.getBytes());
            user.setProfileImageType(ImageValidator.normalizeContentType(file.getContentType()));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read image file");
        }
        userRepository.save(user);
    }

    public ImagePayload getProfileImage(Long userId) {
        User user = getUser(userId);
        if (user.getProfileImage() == null || user.getProfileImage().length == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile image not found");
        }
        return new ImagePayload(user.getProfileImage(), user.getProfileImageType());
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public record ImagePayload(byte[] data, String contentType) {
    }
}
