package com.innosync.dto.notification;

import com.innosync.model.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private String link;
    private String actorName;
    private Long projectId;
    private boolean read;
    /** With an offset, so browsers in any time zone show the right "5 min ago". */
    private OffsetDateTime createdAt;
}
