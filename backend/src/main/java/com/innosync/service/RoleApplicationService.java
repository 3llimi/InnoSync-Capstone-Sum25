package com.innosync.service;

import com.innosync.dto.project.RoleApplicationResponse;
import com.innosync.model.ApplicationStatus;
import com.innosync.model.NotificationType;
import com.innosync.model.Project;
import com.innosync.model.ProjectRole;
import com.innosync.model.RoleApplication;
import com.innosync.model.User;
import com.innosync.repository.RoleApplicationRepository;
import com.innosync.repository.ProjectRoleRepository;
import com.innosync.repository.ProjectTeamMemberRepository;
import com.innosync.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleApplicationService {
    private static final Logger logger = LoggerFactory.getLogger(RoleApplicationService.class);
    private final RoleApplicationRepository applicationRepository;
    private final ProjectRoleRepository projectRoleRepository;
    private final UserRepository userRepository;
    private final ProjectTeamMemberService teamMemberService;
    private final NotificationService notificationService;
    private final ProjectTeamMemberRepository teamMemberRepository;

    @Transactional
    public RoleApplicationResponse createApplication(Long projectRoleId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectRole projectRole = projectRoleRepository.findById(projectRoleId)
                .orElseThrow(() -> new RuntimeException("Project role not found"));

        Project project = projectRole.getProject();
        if (project.getRecruiter().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't apply to your own project");
        }

        if (applicationRepository.existsByUserIdAndProjectRoleId(user.getId(), projectRoleId)) {
            throw new IllegalStateException("You have already applied to this role");
        }

        if (teamMemberRepository.existsByProjectRoleIdAndUserId(projectRoleId, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You're already on the team for this role");
        }

        RoleApplication application = new RoleApplication();
        application.setUser(user);
        application.setProjectRole(projectRole);
        application.setStatus(ApplicationStatus.PENDING);
        application.setAppliedAt(LocalDateTime.now());
        RoleApplication saved = applicationRepository.save(application);

        notificationService.notify(
                project.getRecruiter(),
                NotificationType.APPLICATION_RECEIVED,
                user.getFullName() + " applied to " + project.getTitle(),
                "New application for the " + projectRole.getRoleName() + " role.",
                "/dashboard/applications",
                user.getFullName(),
                project.getId());

        return mapToResponse(saved);
    }

    @Transactional
    public RoleApplicationResponse updateApplicationStatus(Long applicationId, ApplicationStatus status, String updaterEmail) {
        RoleApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        // Verify updater is project recruiter
        if (!application.getProjectRole().getProject().getRecruiter().getEmail().equals(updaterEmail)) {
            throw new AccessDeniedException("Only project recruiter can update application status");
        }

        application.setStatus(status);
        application.setUpdatedAt(LocalDateTime.now());

        // If application is accepted, add user to the project team
        // Already on the team (e.g. joined through an invitation): adding again would throw inside the
        // transaction and roll back the whole status change, so skip it.
        if (status == ApplicationStatus.ACCEPTED && !teamMemberRepository.existsByProjectRoleIdAndUserId(
                application.getProjectRole().getId(), application.getUser().getId())) {
            try {
                teamMemberService.addTeamMember(
                    application.getProjectRole().getId(),
                    application.getUser().getId(),
                    com.innosync.model.ProjectTeamMember.JoinMethod.APPLICATION
                );
                logger.info("User {} added to project team via application acceptance", application.getUser().getEmail());
            } catch (Exception e) {
                logger.error("Failed to add user to project team: {}", e.getMessage());
                // Don't fail the application status update if team member addition fails
                // The application status is still updated
            }
        }

        RoleApplication saved = applicationRepository.save(application);

        if (status == ApplicationStatus.ACCEPTED || status == ApplicationStatus.REJECTED) {
            boolean accepted = status == ApplicationStatus.ACCEPTED;
            Project project = application.getProjectRole().getProject();
            String roleName = application.getProjectRole().getRoleName();
            notificationService.notify(
                    application.getUser(),
                    accepted ? NotificationType.APPLICATION_ACCEPTED : NotificationType.APPLICATION_REJECTED,
                    accepted ? "You're in! Welcome to " + project.getTitle() : "Update on your application to " + project.getTitle(),
                    accepted
                            ? "Your application for " + roleName + " was accepted."
                            : "Your application for " + roleName + " wasn't selected this time.",
                    accepted ? "/dashboard/projects/" + project.getId() : "/dashboard/proposals",
                    project.getRecruiter().getFullName(),
                    project.getId());
        }

        return mapToResponse(saved);
    }

    public List<RoleApplicationResponse> getApplicationsForRole(Long projectRoleId, String recruiterEmail) {
        ProjectRole role = projectRoleRepository.findById(projectRoleId)
                .orElseThrow(() -> new RuntimeException("Project role not found"));

        // Verify requester is project recruiter
        if (!role.getProject().getRecruiter().getEmail().equals(recruiterEmail)) {
            throw new AccessDeniedException("Only project recruiter can view applications");
        }

        return applicationRepository.findByProjectRoleId(projectRoleId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }


    /** Applications received across all of the recruiter's projects (replaces one request per role). */
    public List<RoleApplicationResponse> getApplicationsReceived(String recruiterEmail) {
        return applicationRepository.findReceivedByRecruiterEmail(recruiterEmail).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<RoleApplicationResponse> getApplicationsByUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return applicationRepository.findByUserId(user.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }


    private RoleApplicationResponse mapToResponse(RoleApplication application) {
        RoleApplicationResponse response = new RoleApplicationResponse();

        // Basic application info
        response.setId(application.getId());
        response.setStatus(application.getStatus());
        response.setAppliedAt(application.getAppliedAt());
        response.setUpdatedAt(application.getUpdatedAt());

        // User info
        User user = application.getUser();
        response.setUserId(user.getId());
        response.setUserFullName(user.getFullName());

        // Project role info
        ProjectRole role = application.getProjectRole();
        response.setProjectRoleId(role.getId());
        response.setRoleName(role.getRoleName());

        // Project info
        response.setProjectId(role.getProject().getId());
        response.setProjectTitle(role.getProject().getTitle());
        response.setProjectType(role.getProject().getProjectType());

        return response;
    }
}