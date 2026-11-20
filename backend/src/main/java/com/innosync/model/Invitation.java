package com.innosync.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "invitation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invitation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "project_role_id", nullable = false)
    private ProjectRole projectRole;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    private InvitationStatus status;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    // Each side can delete the invitation from their own list; the row goes once both have.
    // The SQL default lets Hibernate add these columns to tables that already have rows.
    @Column(name = "hidden_by_sender", columnDefinition = "boolean not null default false")
    private boolean hiddenBySender;

    @Column(name = "hidden_by_recipient", columnDefinition = "boolean not null default false")
    private boolean hiddenByRecipient;
}
