package com.innosync.service;

import com.innosync.dto.project.ProjectRequest;
import com.innosync.dto.project.ProjectResponse;
import com.innosync.dto.project.ProjectRoleResponse;
import com.innosync.dto.project.ProjectRoleWithProjectResponse;
import com.innosync.model.Project;
import com.innosync.model.ProjectRole;
import com.innosync.model.ProjectTeamMember;
import com.innosync.model.User;
import com.innosync.repository.ProjectRepository;
import com.innosync.repository.ProjectRoleRepository;
import com.innosync.repository.UserRepository;
import com.innosync.repository.InvitationRepository;
import com.innosync.repository.ProjectTeamMemberRepository;
import com.innosync.repository.RoleApplicationRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private static final Logger logger = LoggerFactory.getLogger(ProjectService.class);

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectRoleRepository projectRoleRepository;
    private final ProjectTeamMemberService teamMemberService;
    private final ProjectTeamMemberRepository teamMemberRepository;
    private final RoleApplicationRepository applicationRepository;
    private final InvitationRepository invitationRepository;

    public ProjectResponse createProject(ProjectRequest request, String email) {
        logger.info("Creating project for recruiter: {}", email);
        try {
            User recruiter =  userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            logger.debug("Recruiter found: {}", recruiter.getEmail());
            Project project = Project.builder()
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .projectType(request.getProjectType())
                    .teamSize(request.getTeamSize())
                    .recruiter(recruiter)
                    .build();
            Project saved = projectRepository.save(project);
            logger.info("Project saved with id: {} for recruiter: {}", saved.getId(), recruiter.getEmail());
            return mapToDTO(saved);
        } catch (Exception e) {
            logger.error("Failed to create project for recruiter: {}", email, e);
            throw e;
        }
    }

    public List<ProjectResponse> getMyProjects(String email) {
        logger.debug("Getting projects for recruiter: {}", email);
        try {
            User recruiter =  userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            List<Project> projects = projectRepository.findByRecruiter(recruiter);
            logger.info("Found {} projects for recruiter: {}", projects.size(), email);
            return projects.stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Failed to get projects for recruiter: {}", email, e);
            throw e;
        }
    }

    public List<ProjectResponse> getJoinedProjects(String email) {
        logger.debug("Getting joined projects for user: {}", email);
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get all team memberships for this user
            List<ProjectTeamMember> teamMemberships = teamMemberService.getTeamMembersByUser(user.getId());

            // Extract unique projects from team memberships
            List<Project> joinedProjects = teamMemberships.stream()
                    .map(ProjectTeamMember::getProject)
                    .distinct()
                    .collect(Collectors.toList());

            logger.info("Found {} joined projects for user: {}", joinedProjects.size(), email);
            return joinedProjects.stream()
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Failed to get joined projects for user: {}", email, e);
            throw e;
        }
    }

    public ProjectResponse getProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        return mapToDTO(project);
    }

    /**
     * Permanently deletes a project the caller owns, together with everything that points at it:
     * team members, applications and invitations for its roles, and the roles themselves.
     * Runs in one transaction, so it either removes everything or nothing.
     */
    @Transactional
    public void deleteProject(Long projectId, String email) {
        Project project = getProjectEntity(projectId);
        if (!project.getRecruiter().getEmail().equals(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the project owner can delete it");
        }

        List<ProjectRole> roles = projectRoleRepository.findByProjectId(projectId);
        teamMemberRepository.deleteAll(teamMemberRepository.findByProjectId(projectId));
        for (ProjectRole role : roles) {
            applicationRepository.deleteAll(applicationRepository.findByProjectRoleId(role.getId()));
            invitationRepository.deleteAll(invitationRepository.findByProjectRoleId(role.getId()));
        }
        projectRoleRepository.deleteAll(roles); // also clears each role's technology links
        projectRepository.delete(project);
        logger.info("Project {} deleted by {} ({} roles removed)", projectId, email, roles.size());
    }

    public Project getProjectEntity(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private ProjectResponse mapToDTO(Project project) {
        ProjectResponse dto = new ProjectResponse();
        dto.setId(project.getId());
        dto.setTitle(project.getTitle());
        dto.setDescription(project.getDescription());
        dto.setCreatedAt(project.getCreatedAt());
        dto.setUpdatedAt(project.getUpdatedAt());
        dto.setProjectType(project.getProjectType());
        dto.setTeamSize(project.getTeamSize());
        return dto;
    }
}
