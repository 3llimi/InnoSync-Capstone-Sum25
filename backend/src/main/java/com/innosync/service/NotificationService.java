package com.innosync.service;

import com.innosync.dto.notification.NotificationFeedResponse;
import com.innosync.dto.notification.NotificationResponse;
import com.innosync.model.Notification;
import com.innosync.model.NotificationType;
import com.innosync.model.User;
import com.innosync.repository.NotificationRepository;
import com.innosync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    /** The bell shows the latest notifications; older ones stay in the database. */
    public static final int MAX_PAGE = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Records a notification for {@code recipient}. Runs inside the caller's transaction, so it is
     * saved only if the action that caused it (invitation, application...) is saved too.
     */
    @Transactional
    public void notify(User recipient, NotificationType type, String title, String message,
                       String link, String actorName, Long projectId) {
        if (recipient == null) return;
        Notification n = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(truncate(title, 255))
                .message(truncate(message, 500))
                .link(link)
                .actorName(actorName)
                .projectId(projectId)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(n);
        logger.debug("Notification {} for user {}", type, recipient.getId());
    }

    @Transactional(readOnly = true)
    public NotificationFeedResponse getFeed(String email, int limit) {
        User user = findUser(email);
        int size = Math.max(1, Math.min(limit, MAX_PAGE));
        List<NotificationResponse> items = notificationRepository
                .findLatest(user.getId(), PageRequest.of(0, size)).stream()
                .map(this::toResponse)
                .toList();
        return new NotificationFeedResponse(notificationRepository.countByRecipientIdAndReadFalse(user.getId()), items);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String email) {
        return notificationRepository.countByRecipientIdAndReadFalse(findUser(email).getId());
    }

    @Transactional
    public NotificationResponse markRead(Long id, String email) {
        Notification n = findOwned(id, email);
        n.setRead(true);
        return toResponse(n);
    }

    @Transactional
    public int markAllRead(String email) {
        return notificationRepository.markAllRead(findUser(email).getId());
    }

    @Transactional
    public void delete(Long id, String email) {
        notificationRepository.delete(findOwned(id, email));
    }

    /** Old notifications about a deleted project would only lead to a "not found" page. */
    @Transactional
    public void deleteForProject(Long projectId) {
        notificationRepository.deleteByProjectId(projectId);
    }

    private Notification findOwned(Long id, String email) {
        User user = findUser(email);
        // Someone else's id answers 404 too, so ids can't be probed.
        return notificationRepository.findByIdAndRecipientId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .link(n.getLink())
                .actorName(n.getActorName())
                .projectId(n.getProjectId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt().atZone(ZoneId.systemDefault()).toOffsetDateTime())
                .build();
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
