package com.innosync.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "application")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoleApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "project_role_id", nullable = false)
    private ProjectRole projectRole;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Each side can delete the application from their own list; the row goes once both have.
    @Column(name = "hidden_by_applicant", columnDefinition = "boolean not null default false")
    private boolean hiddenByApplicant;

    @Column(name = "hidden_by_recruiter", columnDefinition = "boolean not null default false")
    private boolean hiddenByRecruiter;
}