package com.innosync.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * An in-app notification for one user. Created by the services when something happens that the
 * user should know about (an invitation, a reply, an application...). Only the recipient is a
 * foreign key: the project is kept as a plain id so deleting a project never breaks old rows.
 */
@Entity
@Table(name = "notification", indexes = {
        @Index(name = "idx_notification_recipient_created", columnList = "recipient_id, created_at"),
        @Index(name = "idx_notification_project", columnList = "project_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(length = 500)
    private String message;

    /** Frontend path to open when the notification is clicked, e.g. "/dashboard/invitations". */
    private String link;

    /** Name of the person who caused it, shown as the avatar. */
    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
