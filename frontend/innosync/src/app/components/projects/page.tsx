"use client";
import React, { useMemo, useState } from 'react';
import styles from './page.module.css';
import Image from 'next/image';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProjectLogo from '../common/ProjectLogo';
import AnimatedList from '../common/AnimatedList';
import useSheet, { SheetState } from '../common/useSheet';
import { SkeletonBlock, SkeletonGroup, SkeletonPerson } from '../common/Skeleton';
import SmartSearch from '../common/search/SmartSearch';
import SkillPicker from '../common/search/SkillPicker';
import LoadError from '../common/LoadError';
import { countValues, matchesSearch, Searchable, Suggestion } from '../common/search/searchUtils';

interface ProjectPosition {
  name: string;
  skills: string[];
  roleId?: number;
  expertiseLevel?: string; // e.g. ENTRY, MID, SENIOR etc.
}

// API Response interface
interface ApiProjectRole {
  roleId: number;
  roleName: string;
  projectId: number;
  projectTitle: string;
  projectDescription: string;
  expertiseLevel?: string;
  // Present on newer backends (saves one request per project):
  technologies?: string[];
  projectType?: string | null;
  teamSize?: string | null;
}

interface UserApplication {
  id: number;
  projectRoleId: number;
  status: string;
}

interface Project {
  id: number;
  company: string;
  logo: string;
  description: string;
  requiredSkills: string[]; // for all positions
  teamSize: string;
  projectType: string;
  positions: ProjectPosition[];
  badge: string;
  badgeType: 'fullTime' | 'internship' | 'partTime' | 'remote' | 'contract' | 'temporary' | 'research';
  featured?: boolean;
  complexity: string;
  // Add new fields for API integration
  roleId?: number;
  originalTitle?: string;
  roleIdMap?: Record<string, number>;
  rawType?: string; // API project type (FREELANCE, ACADEMIC, ...): drives the logo colour
}

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  selected: boolean;
}

interface ProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  selectedId: number | null;
  allProjects: Project[];
}

interface ProjectDescriptionProps {
  project: Project | null;
  /**
   * Set of roleIds that the current user has already applied to. Used to disable the Apply button
   * when the chosen position was already applied for.
   */
  appliedRoleIds: Set<number>;
}

interface FilterSidebarProps {
  skills: string[];
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
}

// Add filter options
const experienceOptions = ['Entry Level', 'Junior', 'Mid', 'Senior'];
const projectTypeOptions = ['Paid', 'Academic', 'Volunteer'];
const teamSizeOptions = ['1-3', '4-6', '7+'];
const employmentTypeOptions = [
  { label: 'Contract', value: 'contract' },
  { label: 'Full Time', value: 'fullTime' },
  { label: 'Part Time', value: 'partTime' },
  { label: 'Internship', value: 'internship' },
  { label: 'Research', value: 'research' },
];

const FilterSidebar: React.FC<FilterSidebarProps & {
  selectedExperience: string[];
  setSelectedExperience: (exp: string[]) => void;
  selectedProjectType: string[];
  setSelectedProjectType: (type: string[]) => void;
  selectedTeamSize: string[];
  setSelectedTeamSize: (size: string[]) => void;
  selectedEmploymentType: string[];
  setSelectedEmploymentType: (type: string[]) => void;
  onClearFilters: () => void;
  skillOptions: Suggestion[];
}> = ({
  skills, onAddSkill, onRemoveSkill,
  selectedExperience, setSelectedExperience,
  selectedProjectType, setSelectedProjectType,
  selectedTeamSize, setSelectedTeamSize,
  selectedEmploymentType, setSelectedEmploymentType,
  onClearFilters, skillOptions
}) => {
  const handleCheckbox = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(v => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.filterSection}>
        <h3>Experience Level</h3>
        <div className={styles.checkboxGroup}>
          {experienceOptions.map(level => (
            <label className={styles.checkboxLabel} key={level}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selectedExperience.includes(level)}
                onChange={() => handleCheckbox(level, selectedExperience, setSelectedExperience)}
              />
              <span className={styles.customCheckbox}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 8.5L7 11.5L12 5.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {level}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.filterSection}>
        <h3>Project Type</h3>
        <div className={styles.checkboxGroup}>
          {projectTypeOptions.map(type => (
            <label className={styles.checkboxLabel} key={type}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selectedProjectType.includes(type)}
                onChange={() => handleCheckbox(type, selectedProjectType, setSelectedProjectType)}
              />
              <span className={styles.customCheckbox}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 8.5L7 11.5L12 5.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {type}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.filterSection}>
        <h3>Team Size</h3>
        <div className={styles.checkboxGroup}>
          {teamSizeOptions.map(size => (
            <label className={styles.checkboxLabel} key={size}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selectedTeamSize.includes(size)}
                onChange={() => handleCheckbox(size, selectedTeamSize, setSelectedTeamSize)}
              />
              <span className={styles.customCheckbox}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 8.5L7 11.5L12 5.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {size}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.filterSection}>
        <h3>Employment Type</h3>
        <div className={styles.checkboxGroup}>
          {employmentTypeOptions.map(opt => (
            <label className={styles.checkboxLabel} key={opt.value}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selectedEmploymentType.includes(opt.value)}
                onChange={() => handleCheckbox(opt.value, selectedEmploymentType, setSelectedEmploymentType)}
              />
              <span className={styles.customCheckbox}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 8.5L7 11.5L12 5.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.filterSection}>
        <h3>Required Skills</h3>
        <SkillPicker selected={skills} options={skillOptions} onAdd={onAddSkill} onRemove={onRemoveSkill} noun="projects" />
      </div>
      <button
        onClick={onClearFilters}
        className={styles.clearFiltersBtn}
      >
        Clear Filters
      </button>
    </aside>
  );
};


const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, selected }) => (
  <div className={`${styles.projectCard} ${selected ? styles.selected : ''} ${project.featured ? styles.featured : ''}`}
       onClick={() => onSelect(project)}
       onKeyDown={(e) => {
         // Enter/Space selects the card (but not when the Apply button inside has focus).
         if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
           e.preventDefault();
           onSelect(project);
         }
       }}
       role="button"
       tabIndex={0}
       aria-pressed={selected}
       aria-label={`View ${project.company}`}>
    <div className={styles.projectInfo}>
      <div className={styles.companyLogoWrapper}>
        <ProjectLogo title={project.company} projectType={project.rawType} size={48} />
      </div>
      <div className={styles.projectDetails}>
        <div className={styles.projectHeader}>
          <h3 className={styles.projectTitle}>{project.company}</h3>
          <span className={`${styles.badge} ${styles[project.badgeType]}`}>{project.badge}</span>
        </div>
        <div className={styles.projectMeta}>
          <div className={styles.metaItem}>
            <Image src="/complexity-icon.svg" alt="Complexity" width={16} height={16} className={styles.metaIcon} />
            <span>Complexity: {project.complexity}</span>
          </div>
          <div className={styles.metaItem}>
            <Image src="/team-size-icon.svg" alt="Team Size" width={16} height={16} className={styles.metaIcon} />
            <span>Team Size: {project.teamSize}</span>
          </div>
          <div className={styles.metaItem}>
            <Image src="/project-type-icon.svg" alt="Project Type" width={16} height={16} className={styles.metaIcon} />
            <span>Type: {project.projectType}</span>
          </div>
        </div>
        <div className={styles.tagList} style={{ marginTop: 8 }}>
          {project.positions.map((pos, posIndex) => (
            <span
              key={`${pos.roleId ?? pos.name}-${posIndex}`}
              className={selected ? `${styles.skillTag} ${styles.selected}` : styles.skillTag}
            >
              {pos.name}
            </span>
          ))}
        </div>
      </div>
    </div>
    <div className={styles.projectActions}>
      <button className={styles.detailsBtn}>→</button>
      <button className={styles.applyBtn + (selected ? ' ' + styles.selected : '')}>
        Apply Now
      </button>
    </div>
  </div>
);

const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelect, selectedId, allProjects }) => {
  if (projects.length === 0) {
    // Check if this is a "no projects at all" situation or "no projects match filters"
    const isNoProjectsPosted = allProjects.length === 0;

    return (
      <div className={styles.projectList}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            {isNoProjectsPosted ? (
              // Icon for no projects posted
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#9CA3AF"/>
              </svg>
            ) : (
              // Icon for filtered results
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16Z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 12H17" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 9H12" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <h3 className={styles.emptyStateTitle}>
            {isNoProjectsPosted ? 'No Projects Available' : 'No Projects Found'}
          </h3>
          <p className={styles.emptyStateDescription}>
            {isNoProjectsPosted
              ? 'There are currently no projects for you on the platform.'
              : 'We couldn\'t find any projects matching your current filters. Try adjusting your search criteria or clearing filters to see more opportunities.'
            }
          </p>
          <div className={styles.emptyStateSuggestions}>
            <p className={styles.suggestionText}>
              {isNoProjectsPosted ? 'What you can do:' : 'Try:'}
            </p>
            <ul className={styles.suggestionList}>
              {isNoProjectsPosted ? (
                <>
                  <li>Make sure that you are logged in</li>
                  <li>Check back later for new project postings</li>
                  <li>Complete your profile to be ready when projects are available</li>
                </>
              ) : (
                <>
                  <li>Removing some skill requirements</li>
                  <li>Expanding experience level criteria</li>
                  <li>Clearing all filters</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatedList className={styles.projectList} itemClassName={styles.listItem}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onSelect={onSelect}
          selected={selectedId === project.id}
        />
      ))}
    </AnimatedList>
  );
};

const ProjectDescription: React.FC<ProjectDescriptionProps & {
  onApply?: (projectRoleId: number, positionName: string) => Promise<void>;
  sheet: SheetState;
  onClose: () => void;
}> = ({ project, onApply, appliedRoleIds, sheet, onClose }) => {
  // Track the currently chosen role by its unique id (null means no selection)
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // When the project changes, clear selection
  React.useEffect(() => {
    setSelectedRoleId(null);
  }, [project]);

  if (!project) return null;

  // Find the selected position object via roleId
  const selectedPositionObj = project.positions.find(pos => pos.roleId === selectedRoleId);

  // If a position is selected, use its info; otherwise, use project info
  const experienceLevel = selectedPositionObj?.expertiseLevel || project.complexity;
  const requiredSkills = selectedPositionObj
    ? selectedPositionObj.skills
    : Array.from(new Set(project.positions.flatMap(pos => pos.skills)));

  // For Apply button
  const selectedPositionName = selectedPositionObj?.name ?? 'Role';
  const currentRoleId = selectedPositionObj?.roleId ?? project.roleId;
  const alreadyApplied = currentRoleId ? appliedRoleIds.has(currentRoleId) : false;

  const handleApply = async () => {
    if (!selectedPositionObj) {
      toast.error('Please select a position to apply.');
      return;
    }
    if (!currentRoleId || !onApply) return;

    // Check if already applied
    if (alreadyApplied) {
      toast.info('You have already applied to this project.');
      return;
    }

    setIsApplying(true);
    try {
      await onApply(currentRoleId, selectedPositionName);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <aside className={`${styles.projectDescription} ${sheetClass(sheet)}`} aria-label="Project details">
      <button type="button" className={styles.sheetClose} onClick={onClose} aria-label="Close project details">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>

      <div className={styles.descHero}>
        <ProjectLogo title={project.company} projectType={project.rawType} size={64} radius={16} />
        <div className={styles.descHeroText}>
          <span className={styles.descKicker}>{formatLevel(project.projectType || '')} project</span>
          <h2 className={styles.descTitle}>{project.company}</h2>
        </div>
      </div>

      <div className={styles.descStats}>
        <div className={styles.descStat}>
          <Image src="/complexity-icon.svg" alt="" width={16} height={16} />
          <small>Complexity</small>
          <b>{project.complexity || '—'}</b>
        </div>
        <div className={styles.descStat}>
          <Image src="/team-size-icon.svg" alt="" width={16} height={16} />
          <small>Team size</small>
          <b>{project.teamSize || '—'}</b>
        </div>
        <div className={styles.descStat}>
          <Image src="/project-type-icon.svg" alt="" width={16} height={16} />
          <small>Type</small>
          <b>{project.projectType ? formatLevel(project.projectType) : '—'}</b>
        </div>
      </div>

      <section className={styles.descSection}>
        <h4 className={styles.descSectionTitle}>About the project</h4>
        <p className={styles.projectDescText}>{project.description || 'No description yet.'}</p>
      </section>

      <section className={styles.descSection}>
        <h4 className={styles.descSectionTitle}>Open positions</h4>
        <p className={styles.descHint}>Pick a role to see its skills and apply.</p>
        <div className={styles.roleList}>
          {project.positions.map((role, roleIndex) => {
            const isSelected = role.roleId === selectedRoleId;
            const applied = role.roleId ? appliedRoleIds.has(role.roleId) : false;
            return (
              <button
                type="button"
                key={`${role.roleId ?? role.name}-${roleIndex}`}
                className={`${styles.roleOption} ${isSelected ? styles.roleOptionActive : ''}`}
                onClick={() => setSelectedRoleId(isSelected ? null : role.roleId ?? null)}
                aria-pressed={isSelected}
              >
                <span className={styles.roleRadio} aria-hidden="true" />
                <span className={styles.roleName}>{role.name}</span>
                {applied ? (
                  <span className={styles.roleApplied}>Applied</span>
                ) : (
                  role.expertiseLevel && <span className={styles.roleLevel}>{formatLevel(role.expertiseLevel)}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.descSection}>
        <h4 className={styles.descSectionTitle}>
          {selectedPositionObj ? `Skills for ${selectedPositionObj.name}` : 'Skills across the team'}
        </h4>
        <div className={styles.tagList} key={selectedRoleId ?? 'all'}>
          {requiredSkills.length ? (
            requiredSkills.map((tech, i) => (
              <span key={tech} className={styles.tag} style={{ ['--i' as string]: i }}>{tech}</span>
            ))
          ) : (
            <span className={styles.descHint}>No specific skills listed.</span>
          )}
        </div>
      </section>

      {experienceLevel && (
        <section className={styles.descSection}>
          <h4 className={styles.descSectionTitle}>Experience level</h4>
          <div className={styles.tagList}>
            <span className={styles.levelChip}>{formatLevel(experienceLevel)}</span>
          </div>
        </section>
      )}

      <div className={styles.descFooter}>
        <button
          className={styles.mainApplyBtn}
          onClick={handleApply}
          disabled={isApplying || !selectedPositionObj || alreadyApplied}
        >
          {alreadyApplied
            ? 'Applied ✓'
            : isApplying
              ? 'Applying...'
              : selectedPositionObj
                ? `Apply as ${selectedPositionObj.name}`
                : 'Select a position to apply'}
        </button>
      </div>
    </aside>
  );
};

/** "SENIOR" / "senior" -> "Senior" */
function formatLevel(level: string) {
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

/** Bottom-sheet classes for narrow screens (ignored on desktop). */
function sheetClass(state: SheetState) {
  if (state === 'open') return styles.sheetOpen;
  if (state === 'closing') return styles.sheetClosing;
  return '';
}

// Filtering function for projects
function filterProjects(
  projects: Project[],
  selectedExperience: string[],
  selectedProjectType: string[],
  selectedTeamSize: string[],
  requiredSkills: string[],
  selectedEmploymentType: string[]
) {
  return projects.filter(project => {
    // Experience Level
    const expMatch = selectedExperience.length === 0 || selectedExperience.includes(project.complexity);
    // Project Type
    const typeMatch = selectedProjectType.length === 0 || selectedProjectType.includes(project.projectType);
    // Team Size
    const teamMatch = selectedTeamSize.length === 0 || selectedTeamSize.includes(project.teamSize);
    // Required Skills (all must be present, case-insensitive)
    const skillsMatch = requiredSkills.length === 0 || requiredSkills.every(skill =>
      project.requiredSkills.some(pskill => pskill.toLowerCase() === skill.toLowerCase())
    );
    // Employment Type
    const employmentMatch = selectedEmploymentType.length === 0 || selectedEmploymentType.includes(project.badgeType);
    return expMatch && typeMatch && teamMatch && skillsMatch && employmentMatch;
  });
}

/** What the search bar can match on for a project. */
const projectSearchable = (p: Project): Searchable => ({
  tokens: [p.company, ...p.positions.map((pos) => pos.name), ...p.requiredSkills, p.projectType, p.badge, p.complexity],
  text: p.description || '',
});

// The roles endpoint only returns titles and descriptions, so each project's real type, team size and
// role details (skills, levels) are fetched separately and merged in. Anything that fails falls back to
// neutral defaults so the page still renders.
type ProjectExtras = {
  detail: { projectType?: string; teamSize?: string } | null;
  roles: { id: number; roleName: string; expertiseLevel?: string; technologies?: string[] }[];
};

const fetchProjectExtras = async (projectIds: number[], token: string): Promise<Record<number, ProjectExtras>> => {
  const headers = { Authorization: `Bearer ${token}` };
  const base = process.env.NEXT_PUBLIC_API_URL;
  const entries = await Promise.all(
    projectIds.map(async (id): Promise<[number, ProjectExtras]> => {
      try {
        const [detailRes, rolesRes] = await Promise.all([
          fetch(`${base}/api/projects/${id}`, { headers }),
          fetch(`${base}/api/projects/${id}/roles`, { headers }),
        ]);
        return [id, {
          detail: detailRes.ok ? await detailRes.json() : null,
          roles: rolesRes.ok ? await rolesRes.json() : [],
        }];
      } catch {
        return [id, { detail: null, roles: [] }];
      }
    })
  );
  return Object.fromEntries(entries);
};

/** Builds the same extras from a complete /api/projects/roles response, with no extra requests. */
const extrasFromRoles = (apiData: ApiProjectRole[]): Record<number, ProjectExtras> => {
  const extras: Record<number, ProjectExtras> = {};
  apiData.forEach(r => {
    const entry = extras[r.projectId] ??= {
      detail: { projectType: r.projectType ?? undefined, teamSize: r.teamSize ?? undefined },
      roles: [],
    };
    entry.roles.push({
      id: r.roleId,
      roleName: r.roleName,
      expertiseLevel: r.expertiseLevel,
      technologies: r.technologies ?? [],
    });
  });
  return extras;
};

// API enum -> the labels this page's filters use. The filters only know Paid/Academic/Volunteer, so
// research counts as academic and hackathons (unpaid team events) as volunteer.
const PROJECT_TYPE_LABEL: Record<string, string> = {
  FREELANCE: 'Paid', ACADEMIC: 'Academic', RESEARCH: 'Academic', HACKATHON: 'Volunteer',
};
const TEAM_SIZE_LABEL: Record<string, string> = { OneThree: '1-3', FourSix: '4-6', SevenPlus: '7+' };
const EMPLOYMENT: Record<string, { badge: string; badgeType: Project['badgeType'] }> = {
  FREELANCE: { badge: 'Contract', badgeType: 'contract' },
  RESEARCH: { badge: 'Research', badgeType: 'research' },
  ACADEMIC: { badge: 'Part Time', badgeType: 'partTime' },
  HACKATHON: { badge: 'Hackathon', badgeType: 'temporary' },
};
const LEVEL_ORDER = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'RESEARCHER'];
const LEVEL_LABEL: Record<string, string> = {
  ENTRY: 'Entry Level', JUNIOR: 'Junior', MID: 'Mid', SENIOR: 'Senior', RESEARCHER: 'Senior',
};

// Function to transform API data to Project interface
const transformApiDataToProjects = (apiData: ApiProjectRole[], extras: Record<number, ProjectExtras> = {}): Project[] => {
  // Group roles by project
  const projectGroups = apiData.reduce((acc, role) => {
    if (!acc[role.projectId]) {
      acc[role.projectId] = [];
    }
    acc[role.projectId].push(role);
    return acc;
  }, {} as Record<number, ApiProjectRole[]>);

  // Transform each project group to Project interface
  return Object.values(projectGroups).map((roles) => {
    const firstRole = roles[0];
    const extra = extras[firstRole.projectId];
    const rawType = extra?.detail?.projectType;
    const employment = (rawType && EMPLOYMENT[rawType]) || { badge: 'Full Time', badgeType: 'fullTime' as const };

    // Create a map of role names to role IDs for easy lookup
    const roleIdMap = roles.reduce((acc, role) => {
      acc[role.roleName] = role.roleId;
      return acc;
    }, {} as Record<string, number>);

    const positions = roles.map(role => {
      const detail = extra?.roles.find(r => r.id === role.roleId);
      return {
        name: role.roleName,
        skills: detail?.technologies ?? [],
        roleId: role.roleId, // Store roleId for each position
        expertiseLevel: detail?.expertiseLevel,
      };
    });

    // The project's complexity is its most senior role.
    const topLevel = positions
      .map(p => LEVEL_ORDER.indexOf(p.expertiseLevel ?? ''))
      .reduce((max, i) => Math.max(max, i), -1);

    return {
      id: firstRole.projectId,
      company: firstRole.projectTitle,
      logo: '/company_logo.svg', // Unused by the UI now (a generated logo is drawn); kept for the mock data shape
      description: firstRole.projectDescription,
      requiredSkills: Array.from(new Set(positions.flatMap(p => p.skills))),
      teamSize: (extra?.detail?.teamSize && TEAM_SIZE_LABEL[extra.detail.teamSize]) || '4-6',
      projectType: (rawType && PROJECT_TYPE_LABEL[rawType]) || 'Paid',
      positions,
      badge: employment.badge,
      badgeType: employment.badgeType,
      complexity: topLevel >= 0 ? LEVEL_LABEL[LEVEL_ORDER[topLevel]] : 'Mid',
      originalTitle: firstRole.projectTitle,
      roleId: firstRole.roleId, // Store the first role ID as default
      roleIdMap, // Store the mapping for easy lookup
      rawType,
    };
  });
};

// Function to fetch projects from API
const fetchProjects = async (): Promise<Project[] | null> => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ FETCH PROJECTS: No authentication token found');
    toast.error('You are not logged in');
    return [];
  }


  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/roles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ FETCH PROJECTS: API request failed with status ${response.status}: ${response.statusText}`);
      console.error(`❌ FETCH PROJECTS: Error response body:`, errorText);
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    const apiData: ApiProjectRole[] = await response.json();

    if (apiData.length === 0) {
      console.warn('⚠️ FETCH PROJECTS: No project roles found in database');
      toast.warning('No projects available. Create a project first to see available roles.');
      return [];
    }

    // Newer backends include each role's level/skills and the project's type/size in this one response.
    // Older ones don't, so fall back to fetching every project's details and roles separately.
    const complete = apiData.every(r => r.projectType !== undefined && r.technologies !== undefined);
    const extras = complete
      ? extrasFromRoles(apiData)
      : await fetchProjectExtras(Array.from(new Set(apiData.map(r => r.projectId))), token);
    const transformedProjects = transformApiDataToProjects(apiData, extras);

    return transformedProjects;
  } catch (error) {
    console.error('❌ FETCH PROJECTS: Error occurred:', error);
    toast.error('Failed to load projects');
    return null; // the page shows LoadError with a Retry button instead of sample data
  }
};

// Function to apply for a project role
const applyForProjectRole = async (projectRoleId: number): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ APPLY PROJECT: No authentication token found');
    toast.error('Please log in to apply for projects');
    return false;
  }


  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications/project-roles/${projectRoleId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ APPLY PROJECT: API request failed with status ${response.status}: ${response.statusText}`);
      console.error(`❌ APPLY PROJECT: Error response body:`, errorText);

      // Provide more specific error messages
      if (response.status === 409) {
        toast.error("You've already applied to this role, or you're already on its team.");
      } else if (response.status === 400) {
        toast.error("You can't apply to your own project.");
      } else if (response.status === 404) {
        toast.error('Project role not found');
      } else if (response.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(`Failed to submit application: ${response.status} ${response.statusText}`);
      }

      throw new Error(`Failed to submit application: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json().catch(() => null); // In case response is not JSON

    return true;
  } catch (error) {
    console.error(`❌ APPLY PROJECT: Error occurred while applying for role ID ${projectRoleId}:`, error);
    // Don't show toast here as it's already shown above
    return false;
  }
};

// ---------------- API TYPES ----------------
interface ApiProjectDetails {
  id: number;
  title: string;
  description: string;
  requiredSkills: string[];
  teamSize: 'OneThree' | 'FourSix' | 'SevenPlus';
  projectType: string;
  logoUrl?: string;
  complexity?: string;
}

// Map backend enum to human-readable string
const mapTeamSize = (value: ApiProjectDetails['teamSize']): string => {
  switch (value) {
    case 'OneThree':
      return '1-3';
    case 'FourSix':
      return '4-6';
    case 'SevenPlus':
      return '7+';
    default:
      return value;
  }
};

// Fetch detailed project info
const fetchProjectDetails = async (projectId: number): Promise<ApiProjectDetails | null> => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch project details: ${res.status} ${res.statusText}`);
      return null;
    }

    const data: ApiProjectDetails = await res.json();
    return data;
  } catch (err) {
    console.error('Error fetching project details', err);
    return null;
  }
};

// ---- API Role list ----
interface ApiProjectRoleDetails {
  id: number;
  roleName: string;
  expertiseLevel: string; // ENTRY, JUNIOR, etc.
  technologies: string[];
}

// Fetch roles for a specific project
const fetchProjectRoles = async (projectId: number): Promise<ProjectPosition[]> => {
  const token = localStorage.getItem('token');
  if (!token) return [];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch project roles: ${res.status} ${res.statusText}`);
      return [];
    }

    const data: ApiProjectRoleDetails[] = await res.json();

    return data.map(r => ({
      name: r.roleName,
      skills: r.technologies,
      roleId: r.id,
      expertiseLevel: r.expertiseLevel,
    }));
  } catch (err) {
    console.error('Error fetching project roles', err);
    return [];
  }
};

const FindProjectPage = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const detailSheet = useSheet();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedProjectType, setSelectedProjectType] = useState<string[]>([]);
  const [selectedTeamSize, setSelectedTeamSize] = useState<string[]>([]);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string[]>([]);
  const [appliedRoleIds, setAppliedRoleIds] = useState<Set<number>>(new Set());

  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadProjects = async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    const fetchedProjects = await fetchProjects();
    setLoadFailed(fetchedProjects === null);
    const list = fetchedProjects ?? [];
    setProjects(list);
    if (list.length > 0) setSelectedProject(list[0]);
    setLoading(false);
    setRetrying(false);
  };

  // Fetch projects on component mount
  React.useEffect(() => {
    loadProjects();

    // Fetch applications that the user has already submitted so we can disable duplicates
    const loadUserApplications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          console.error(`Failed to fetch user applications: ${res.status} ${res.statusText}`);
          return;
        }

        const data: UserApplication[] = await res.json();
        const ids = new Set<number>(data.map(app => app.projectRoleId));
        setAppliedRoleIds(ids);
      } catch (err) {
        console.error('Error while fetching user applications', err);
      }
    };

    loadUserApplications();
  }, []);

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(tags => tags.filter(t => t !== tag));
  };

  const handleAddTag = (tag: string) => {
    if (selectedTags.length >= 10) {
      toast.error('You can only add up to 10 tags.');
      return;
    }
    if (selectedTags.includes(tag)) {
      toast.error('This tag is already added.');
      return;
    }
    setSelectedTags(tags => [...tags, tag]);
  };

  const handleRemoveSkill = (skill: string) => {
    setRequiredSkills(skills => skills.filter(s => s !== skill));
  };

  const handleAddSkill = (skill: string) => {
    if (requiredSkills.length >= 10) {
      toast.error('You can only add up to 10 skills.');
      return;
    }
    if (requiredSkills.includes(skill)) {
      toast.error('This skill is already added.');
      return;
    }
    setRequiredSkills(skills => [...skills, skill]);
  };

  const handleClearFilters = () => {
    setSelectedExperience([]);
    setSelectedProjectType([]);
    setSelectedTeamSize([]);
    setRequiredSkills([]);
    setSelectedEmploymentType([]);
  };

  const handleApplyForProject = async (projectRoleId: number, positionName: string) => {
    const success = await applyForProjectRole(projectRoleId);
    if (success) {
      toast.success(`Application was successfully sent for ${positionName} position`);
      setAppliedRoleIds(prev => new Set(prev).add(projectRoleId));
    }
  };

  const handleSelectProject = async (project: Project) => {
    // Immediately show base info so UI feels responsive
    setSelectedProject(project);
    detailSheet.open(); // narrow screens: details slide up as a sheet

    // The list already carries type, size, roles, levels and skills (rawType is set once that data
    // arrived), so only fetch again if it's missing.
    if (project.rawType && project.positions.every(p => p.expertiseLevel !== undefined)) return;

    // Fetch detailed info and merge
    const details = await fetchProjectDetails(project.id);
    if (details) {
      setSelectedProject(prev => prev ? {
        ...prev,
        description: details.description || prev.description,
        requiredSkills: details.requiredSkills?.length ? details.requiredSkills : prev.requiredSkills,
        teamSize: mapTeamSize(details.teamSize),
        projectType: details.projectType || prev.projectType,
        company: details.title || prev.company,
        logo: details.logoUrl || prev.logo,
        complexity: details.complexity || prev.complexity,
      } : prev);
    }

    // Fetch roles for this project (technologies & expertise level)
    const roles = await fetchProjectRoles(project.id);
    if (roles.length) {
      const roleIdMap = roles.reduce((acc, r) => {
        acc[r.name] = r.roleId as number;
        return acc;
      }, {} as Record<string, number>);

      setSelectedProject(prev => prev ? {
        ...prev,
        positions: roles,
        roleId: roles[0]?.roleId ?? prev.roleId,
        roleIdMap,
      } : prev);
    }
  };

  // Suggestions for the search bar and the skill picker, built from the projects actually loaded.
  const skillOptions = useMemo(() => countValues(projects.flatMap((p) => p.requiredSkills), 'skill'), [projects]);
  const searchSuggestions = useMemo(() => [
    ...skillOptions,
    ...countValues(projects.flatMap((p) => p.positions.map((pos) => pos.name)), 'role'),
    ...countValues(projects.map((p) => p.company), 'project'),
    ...countValues(projects.map((p) => p.badge), 'type'),
  ], [projects, skillOptions]);
  const knownSearchValues = useMemo(
    () => new Set(searchSuggestions.map((s) => s.label.toLowerCase())),
    [searchSuggestions]
  );

  const filteredProjects = filterProjects(
    projects,
    selectedExperience,
    selectedProjectType,
    selectedTeamSize,
    requiredSkills,
    selectedEmploymentType
  ).filter((p) => matchesSearch(projectSearchable(p), searchQuery, selectedTags, knownSearchValues));

  // The detail panel follows the results: keep the (possibly enriched) selection if it's still listed,
  // otherwise show the first match.
  const shownProject = filteredProjects.some((p) => p.id === selectedProject?.id)
    ? selectedProject
    : filteredProjects[0] ?? null;

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <SkeletonGroup label="Loading projects">
          <div style={{ background: '#f2f4f8', padding: '38px 20px 46px', display: 'flex', justifyContent: 'center' }}>
            <SkeletonBlock width="min(836px, 100%)" height={48} radius={8} />
          </div>
          <div className={styles.mainContainer}>
            <div className={styles.sidebar} aria-hidden="true">
              {[0, 1, 2].map((g) => (
                <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  <SkeletonBlock width="60%" height={20} />
                  {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} width="45%" height={14} />)}
                </div>
              ))}
            </div>
            <main className={styles.mainContent}>
              {[0, 1, 2, 3, 4].map((i) => <SkeletonPerson key={i} index={i} />)}
            </main>
            <aside className={styles.projectDescription} aria-hidden="true">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <SkeletonBlock width={80} height={80} radius={16} />
                <SkeletonBlock width="70%" height={24} />
                <SkeletonBlock height={90} />
              </div>
            </aside>
          </div>
        </SkeletonGroup>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <SmartSearch
        query={searchQuery}
        onQueryChange={setSearchQuery}
        chips={selectedTags}
        onAddChip={handleAddTag}
        onRemoveChip={handleRemoveTag}
        onClearAll={() => {
          setSearchQuery('');
          setSelectedTags([]);
        }}
        suggestions={searchSuggestions}
        resultCount={filteredProjects.length}
        totalCount={projects.length}
        noun="projects"
        placeholder="Search projects by title, role, skill or keyword"
      />
      <div className={filteredProjects.length === 0 ? styles.mainContainerNoProjects : styles.mainContainer}>
        <FilterSidebar
          skills={requiredSkills}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
          selectedExperience={selectedExperience}
          setSelectedExperience={setSelectedExperience}
          selectedProjectType={selectedProjectType}
          setSelectedProjectType={setSelectedProjectType}
          selectedTeamSize={selectedTeamSize}
          setSelectedTeamSize={setSelectedTeamSize}
          selectedEmploymentType={selectedEmploymentType}
          setSelectedEmploymentType={setSelectedEmploymentType}
          onClearFilters={handleClearFilters}
          skillOptions={skillOptions}
        />
        <main className={styles.mainContent}>
          {loadFailed ? (
            <LoadError what="projects" onRetry={() => loadProjects(true)} retrying={retrying} />
          ) : (
            <ProjectList
              projects={filteredProjects}
              onSelect={handleSelectProject}
              selectedId={shownProject?.id ?? null}
              allProjects={projects}
            />
          )}
        </main>
        {filteredProjects.length > 0 && (
          <ProjectDescription
            key={shownProject?.id ?? "none"} /* remount = cross-fade when another project is picked */
            project={shownProject}
            onApply={handleApplyForProject}
            appliedRoleIds={appliedRoleIds}
            sheet={detailSheet.state}
            onClose={detailSheet.close}
          />
        )}
      </div>
      {detailSheet.state !== 'closed' && (
        <div
          className={`${styles.sheetBackdrop} ${detailSheet.state === 'closing' ? styles.sheetBackdropClosing : ''}`}
          onClick={detailSheet.close}
          aria-hidden="true"
        />
      )}
      <ToastContainer aria-label="Notification messages" />
    </div>
  );
};

export default FindProjectPage;
