package com.innosync.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/** The latest notifications plus the unread total (which can be larger than the page). */
@Data
@AllArgsConstructor
public class NotificationFeedResponse {
    private long unreadCount;
    private List<NotificationResponse> items;
}
