package com.innosync.service;

import com.innosync.dto.project.InvitationRequest;
import com.innosync.dto.project.InvitationResponse;
import com.innosync.model.*;
import com.innosync.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvitationService {
    private static final Logger logger = LoggerFactory.getLogger(InvitationService.class);
    private final InvitationRepository invitationRepository;
    private final ProjectRoleRepository projectRoleRepository;
    private final UserRepository userRepository;
    private final ProjectTeamMemberService teamMemberService;
    private final ProjectTeamMemberRepository teamMemberRepository;
    private final NotificationService notificationService;

    @Transactional
    public InvitationResponse createInvitation(InvitationRequest request, String recruiterEmail) {
        logger.info("Creating invitation from recruiter: {}", recruiterEmail);
        Long projectRoleId = request.getProjectRoleId();
        Long recipientId = request.getRecipientId();

        if (projectRoleId == null || recipientId == null || recruiterEmail == null || recruiterEmail.isBlank()) {
            throw new IllegalArgumentException("Missing required parameters");
        }

        ProjectRole role = projectRoleRepository.findById(projectRoleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project role not found"));

        if (!role.getProject().getRecruiter().getEmail().equals(recruiterEmail)) {
            throw new AccessDeniedException("Only project recruiter can send invitations");
        }

        User recruiter = userRepository.findByEmail(recruiterEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recruiter not found"));

        if (recruiter.getId().equals(recipientId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't invite yourself");
        }

        if (invitationRepository.existsByRecipientIdAndProjectRoleIdAndStatus(
                recipientId, projectRoleId, InvitationStatus.INVITED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invitation already exists");
        }

        if (teamMemberRepository.existsByProjectRoleIdAndUserId(projectRoleId, recipientId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This person is already on the team for this role");
        }

        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient user not found"));

        Invitation invitation = new Invitation();
        invitation.setProjectRole(role);
        invitation.setSender(recruiter);
        invitation.setRecipient(recipient);
        invitation.setStatus(InvitationStatus.INVITED);
        invitation.setSentAt(LocalDateTime.now());

        Invitation saved = invitationRepository.save(invitation);

        Project project = role.getProject();
        notificationService.notify(
                recipient,
                NotificationType.INVITATION_RECEIVED,
                recruiter.getFullName() + " invited you to join " + project.getTitle(),
                "Role: " + role.getRoleName() + ". Accept or decline from your invitations.",
                "/dashboard/invitations",
                recruiter.getFullName(),
                project.getId());

        return mapToResponse(saved);
    }

    @Transactional
    public InvitationResponse respondToInvitation(Long invitationId, InvitationStatus response, String userEmail) {
        logger.info("User {} responding to invitation {} with status {}", userEmail, invitationId, response);
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found"));

        if (!invitation.getRecipient().getEmail().equals(userEmail)) {
            throw new AccessDeniedException("Only the invited user can respond");
        }

        if (invitation.getStatus() != InvitationStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invitation already responded to");
        }

        invitation.setStatus(response);
        invitation.setRespondedAt(LocalDateTime.now());

        // If invitation is accepted, add user to the project team
        // Skip if already on the team: a failed insert would roll back the whole response.
        if (response == InvitationStatus.ACCEPTED && !teamMemberRepository.existsByProjectRoleIdAndUserId(
                invitation.getProjectRole().getId(), invitation.getRecipient().getId())) {
            try {
                teamMemberService.addTeamMember(
                    invitation.getProjectRole().getId(),
                    invitation.getRecipient().getId(),
                    com.innosync.model.ProjectTeamMember.JoinMethod.INVITATION
                );
                logger.info("User {} added to project team via invitation acceptance", invitation.getRecipient().getEmail());
            } catch (Exception e) {
                logger.error("Failed to add user to project team: {}", e.getMessage());
                // Don't fail the invitation response if team member addition fails
                // The invitation status is still updated
            }
        }

        Invitation saved = invitationRepository.save(invitation);

        if (response == InvitationStatus.ACCEPTED || response == InvitationStatus.DECLINED) {
            boolean accepted = response == InvitationStatus.ACCEPTED;
            Project project = invitation.getProjectRole().getProject();
            String who = invitation.getRecipient().getFullName();
            notificationService.notify(
                    invitation.getSender(),
                    accepted ? NotificationType.INVITATION_ACCEPTED : NotificationType.INVITATION_DECLINED,
                    who + (accepted ? " accepted your invitation" : " declined your invitation"),
                    accepted
                            ? who + " joined " + project.getTitle() + " as " + invitation.getProjectRole().getRoleName() + "."
                            : "The " + invitation.getProjectRole().getRoleName() + " role on " + project.getTitle() + " is still open. Quick Sync can suggest someone else.",
                    accepted ? "/dashboard/projects/" + project.getId() : "/dashboard/projects/quicksync?project=" + project.getId(),
                    who,
                    project.getId());
        }

        return mapToResponse(saved);
    }

    public List<InvitationResponse> getSentInvitations(String recruiterEmail) {
        logger.debug("Getting sent invitations for recruiter: {}", recruiterEmail);
        User recruiter = userRepository.findByEmail(recruiterEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recruiter not found"));

        return invitationRepository.findBySenderId(recruiter.getId()).stream()
                .filter(i -> !i.isHiddenBySender())
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<InvitationResponse> getReceivedInvitations(String userEmail) {
        logger.debug("Getting received invitations for user: {}", userEmail);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        return invitationRepository.findByRecipientId(user.getId()).stream()
                .filter(i -> !i.isHiddenByRecipient())
                .map(this::mapToResponse)
                .sorted(Comparator.comparing(InvitationResponse::getSentAt).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Removes an invitation from the caller's list.
     * A pending invitation is settled first, so nobody is left waiting:
     * the sender deleting it withdraws it for both sides; the recipient deleting it declines it.
     */
    @Transactional
    public void deleteInvitation(Long invitationId, String userEmail) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found"));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        boolean isSender = invitation.getSender().getId().equals(user.getId());
        boolean isRecipient = invitation.getRecipient().getId().equals(user.getId());
        if (!isSender && !isRecipient) {
            // Same answer as a missing id, so ids can't be probed.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found");
        }

        if (invitation.getStatus() == InvitationStatus.INVITED) {
            if (isSender) {
                invitationRepository.delete(invitation); // withdrawn before an answer: gone for both
                logger.info("Invitation {} withdrawn by {}", invitationId, userEmail);
                return;
            }
            invitation.setStatus(InvitationStatus.DECLINED);
            invitation.setRespondedAt(LocalDateTime.now());
            Project project = invitation.getProjectRole().getProject();
            String who = invitation.getRecipient().getFullName();
            notificationService.notify(
                    invitation.getSender(),
                    NotificationType.INVITATION_DECLINED,
                    who + " declined your invitation",
                    "The " + invitation.getProjectRole().getRoleName() + " role on " + project.getTitle() + " is still open. Quick Sync can suggest someone else.",
                    "/dashboard/projects/quicksync?project=" + project.getId(),
                    who,
                    project.getId());
        }

        if (isSender) invitation.setHiddenBySender(true);
        if (isRecipient) invitation.setHiddenByRecipient(true);

        if (invitation.isHiddenBySender() && invitation.isHiddenByRecipient()) {
            invitationRepository.delete(invitation);
        } else {
            invitationRepository.save(invitation);
        }
        logger.info("Invitation {} deleted from the list of {}", invitationId, userEmail);
    }

    private InvitationResponse mapToResponse(Invitation invitation) {
        return InvitationResponse.builder()
                .id(invitation.getId())
                .projectRoleId(invitation.getProjectRole().getId())
                .roleName(invitation.getProjectRole().getRoleName())
                .projectId(invitation.getProjectRole().getProject().getId())
                .projectTitle(invitation.getProjectRole().getProject().getTitle())
                .recipientId(invitation.getRecipient().getId())
                .recipientName(invitation.getRecipient().getFullName())
                .senderId(invitation.getSender().getId())
                .senderName(invitation.getSender().getFullName())
                .senderEmail(invitation.getSender().getEmail())
                .status(invitation.getStatus())
                .sentAt(invitation.getSentAt())
                .respondedAt(invitation.getRespondedAt())
                .build();
    }
}
