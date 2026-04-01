package com.ecourt.service;

import com.ecourt.dto.NotificationListResponse;
import com.ecourt.dto.NotificationResponse;
import com.ecourt.model.Notification;
import com.ecourt.model.User;
import com.ecourt.repository.NotificationRepository;
import com.ecourt.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public NotificationListResponse getCurrentUserNotifications() {
        String username = requireAuthentication().getName();
        List<NotificationResponse> notifications = notificationRepository
                .findTop20ByRecipientUsernameOrderByCreatedAtDesc(username)
                .stream()
                .map(this::toResponse)
                .toList();
        long unreadCount = notificationRepository.countByRecipientUsernameAndIsReadFalse(username);
        return new NotificationListResponse(notifications, unreadCount);
    }

    public NotificationResponse markAsRead(Long notificationId) {
        String username = requireAuthentication().getName();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));

        if (!username.equals(notification.getRecipientUsername())) {
            throw new AccessDeniedException("Access denied: You cannot update this notification.");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
        }

        return toResponse(notification);
    }

    public void markAllAsRead() {
        String username = requireAuthentication().getName();
        List<Notification> notifications = notificationRepository.findByRecipientUsernameAndIsReadFalse(username);
        Instant now = Instant.now();
        for (Notification notification : notifications) {
            notification.setRead(true);
            notification.setReadAt(now);
        }
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }

    public void notifyUsers(
            Set<String> usernames,
            String actorUsername,
            String eventType,
            String title,
            String message,
            String caseNumber) {
        if (usernames == null || usernames.isEmpty()) {
            return;
        }

        Set<String> recipients = new LinkedHashSet<>(usernames);
        recipients.removeIf(username -> username == null || username.isBlank() || username.equals(actorUsername));
        if (recipients.isEmpty()) {
            return;
        }

        List<User> users = userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> recipients.contains(user.getUsername()))
                .toList();

        if (users.isEmpty()) {
            return;
        }

        List<Notification> notifications = users.stream()
                .map(user -> buildNotification(user, eventType, title, message, caseNumber))
                .toList();
        notificationRepository.saveAll(notifications);
    }

    public void notifyUser(
            String username,
            String actorUsername,
            String eventType,
            String title,
            String message,
            String caseNumber) {
        notifyUsers(Set.of(username), actorUsername, eventType, title, message, caseNumber);
    }

    private Notification buildNotification(
            User user,
            String eventType,
            String title,
            String message,
            String caseNumber) {
        Notification notification = new Notification();
        notification.setRecipientUsername(user.getUsername());
        notification.setRecipientRole(user.getRole());
        notification.setEventType(eventType);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setCaseNumber(caseNumber);
        return notification;
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getEventType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getCaseNumber(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt());
    }

    private Authentication requireAuthentication() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new AccessDeniedException("Authentication required.");
        }
        return auth;
    }
}
