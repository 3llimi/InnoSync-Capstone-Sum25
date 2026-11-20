package com.innosync.dto.project;

import com.innosync.model.ExpertiseLevel;
import com.innosync.model.ProjectType;
import com.innosync.model.TeamSize;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One open role together with the project it belongs to. Carries everything the "Find Project"
 * page needs, so the frontend doesn't have to request each project and its roles separately.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectRoleWithProjectResponse {
    private Long roleId;
    private String roleName;
//    private String roleDescription;
    private Long projectId;
    private String projectTitle;
    private String projectDescription;
    private ExpertiseLevel expertiseLevel;
    private List<String> technologies;
    private ProjectType projectType;
    private TeamSize teamSize;
}
