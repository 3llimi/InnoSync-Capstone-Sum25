package com.innosync.controller;

import com.innosync.dto.notification.NotificationFeedResponse;
import com.innosync.dto.notification.NotificationResponse;
import com.innosync.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification API", description = "In-app notifications for the signed-in user")
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Latest notifications and the unread count")
    public ResponseEntity<NotificationFeedResponse> getFeed(
            @RequestParam(defaultValue = "30") int limit,
            Authentication authentication) {
        return ResponseEntity.ok(notificationService.getFeed(authentication.getName(), limit));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Number of unread notifications")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(authentication.getName())));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark one notification as read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(notificationService.markRead(id, authentication.getName()));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Mark every notification as read")
    public ResponseEntity<Map<String, Integer>> markAllRead(Authentication authentication) {
        return ResponseEntity.ok(Map.of("updated", notificationService.markAllRead(authentication.getName())));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Dismiss a notification")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        notificationService.delete(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
