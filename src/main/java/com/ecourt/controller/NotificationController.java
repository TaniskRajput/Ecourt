package com.ecourt.controller;

import com.ecourt.dto.MessageResponse;
import com.ecourt.dto.NotificationListResponse;
import com.ecourt.dto.NotificationResponse;
import com.ecourt.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public NotificationListResponse getNotifications() {
        return notificationService.getCurrentUserNotifications();
    }

    @PutMapping("/{notificationId}/read")
    public NotificationResponse markAsRead(@PathVariable Long notificationId) {
        return notificationService.markAsRead(notificationId);
    }

    @PutMapping("/read-all")
    public MessageResponse markAllAsRead() {
        notificationService.markAllAsRead();
        return new MessageResponse("Notifications marked as read.");
    }
}
