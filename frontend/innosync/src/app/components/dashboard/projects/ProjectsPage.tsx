"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import styles from "./ProjectsPage.module.css";
import ProjectCreationPanel from "../project-creation/ProjectCreationPanel";
import ProjectBanner from "../../common/ProjectBanner";
import AnimatedList from "../../common/AnimatedList";
import { SkeletonCard, SkeletonGroup } from "../../common/Skeleton";

interface Project {
  id: number;
  title: string;
  description: string;
  projectType: string;
  teamSize: string;
  createdAt: string;
  updatedAt: string;
  status?: "active" | "completed" | "pending" | "archived";
  messages?: number;
  attachments?: number;
  progress?: string;
  ownershipType?: "owned" | "joined";
}

export default function ProjectsPage() {
  const router = useRouter();
  const [showCreationPanel, setShowCreationPanel] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects from API
  const fetchProjects = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch both owned and joined projects
      const [ownedResponse, joinedResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/joined`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!ownedResponse.ok) {
        throw new Error(`Failed to fetch owned projects: ${ownedResponse.status} ${ownedResponse.statusText}`);
      }

      if (!joinedResponse.ok) {
        throw new Error(`Failed to fetch joined projects: ${joinedResponse.status} ${joinedResponse.statusText}`);
      }

      const ownedData: Project[] = await ownedResponse.json();
      const joinedData: Project[] = await joinedResponse.json();

      // Transform the data to include UI-specific fields
      const transformedOwnedProjects = ownedData.map(project => ({
        ...project,
        status: "active" as const,
        messages: 0,
        attachments: 0,
        progress: "0/0",
        ownershipType: "owned" as const
      }));

      const transformedJoinedProjects = joinedData.map(project => ({
        ...project,
        status: "active" as const,
        messages: 0,
        attachments: 0,
        progress: "0/0",
        ownershipType: "joined" as const
      }));

      // Combine and deduplicate projects (in case user owns and is a member of the same project)
      const allProjects = [...transformedOwnedProjects, ...transformedJoinedProjects];
      const uniqueProjects = allProjects.filter((project, index, self) =>
        index === self.findIndex(p => p.id === project.id)
      );

      setProjects(uniqueProjects);
      toast.success(`Successfully loaded ${uniqueProjects.length} projects`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      toast.error(`Error loading projects: ${errorMessage}`);
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // "/dashboard/projects?new=1" (the dashboard header's "New project" button) opens the creation panel directly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setShowCreationPanel(true);
    }
  }, []);

  const handleNewProject = () => {
    setShowCreationPanel(true);
  };

  const handleArchiveProject = async (projectId: number) => {
    // For now, we'll just update the local state
    // In the future, you might want to add an API endpoint to update project status
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === projectId
          ? { ...project, status: "archived" as const }
          : project
      )
    );
    toast.success('Project archived successfully');
  };

  const handleDeleteProject = async (projectId: number): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required');
      return false;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // 404 = already gone (e.g. deleted in another tab): treat as success.
      if (!res.ok && res.status !== 404) {
        const message =
          res.status === 403 ? 'Only the project owner can delete it.'
          : res.status === 405 ? 'The server is still updating. Please try again in a few minutes.'
          : `Failed to delete project (${res.status}).`;
        toast.error(message);
        return false;
      }

      // Removed from the server: take it off the list (AnimatedList fades it out).
      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
      toast.success('Project deleted');
      return true;
    } catch (err) {
      toast.error('Network error: the project was not deleted.');
      console.error('Error deleting project:', err);
      return false;
    }
  };

  const handleProjectCreated = () => {
    // Refresh the projects list when a new project is created
    fetchProjects();
    setShowCreationPanel(false);
  };

  if (loading) {
    return (
      <div className={styles.projectsContent}>
        <SkeletonGroup label="Loading your projects">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} index={i} />)}
        </SkeletonGroup>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.projectsContent}>
        <div className={styles.errorContainer}>
          <p>Error: {error}</p>
          <button onClick={fetchProjects} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.projectsContent}>
      <div className={styles.projectsGrid}>
        <div className={styles.projectCardsColumn + (showCreationPanel ? ' ' + styles.panelOpen : '')}>
          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 4L44 24L24 44L4 24L24 4Z" stroke="#9EA3A9" strokeWidth="2"/>
                  <path d="M24 12L36 24L12 24L24 12Z" fill="#9EA3A9"/>
                </svg>
              </div>
              <h3 className={styles.emptyStateTitle}>No projects yet</h3>
              <p className={styles.emptyStateDescription}>
                Create your first project to get started with team collaboration.
              </p>
            </div>
          ) : (
            /* Cards already rise in on load (appear={false}); AnimatedList handles removal and reflow. */
            <AnimatedList className={styles.projectsList} itemClassName={styles.cardSlot} appear={false}>
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  index={index}
                  project={project}
                  router={router}
                  onArchive={() => handleArchiveProject(project.id)}
                  onDelete={() => handleDeleteProject(project.id)}
                />
              ))}
            </AnimatedList>
          )}
          {/* Add Project Button */}
          <button type="button" className={styles.addProjectCard} onClick={handleNewProject}>
            <div className={styles.addIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 10H15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 5V15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={styles.addText}>New Project</span>
          </button>
        </div>
        <div className={styles.panelColumn + (showCreationPanel ? ' ' + styles.open : '')}>
          <ProjectCreationPanel
            open={showCreationPanel}
            onClose={() => setShowCreationPanel(false)}
            onProjectCreated={handleProjectCreated}
          />
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  index?: number;
  router: ReturnType<typeof useRouter>;
  onArchive: () => void;
  onDelete: () => Promise<boolean>;
}

function ProjectCard({ project, index = 0, router, onArchive, onDelete }: ProjectCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  // Delete asks for a second click, and shows progress while the request runs.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Closing the menu cancels a pending "confirm delete".
  useEffect(() => {
    if (!showDropdown) setConfirmDelete(false);
  }, [showDropdown]);

  const handleDeleteClick = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const ok = await onDelete();
    if (!ok) {
      setDeleting(false);
      setConfirmDelete(false);
    }
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleCardClick = () => {
    router.push(`/dashboard/projects/${project.id}`);
  };

  const handleMoreOptionsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleOptionClick = (action: () => void) => {
    action();
    setShowDropdown(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#34A853";
      case "archived":
        return "#9EA3A9";
      case "completed":
        return "#4285F4";
      case "pending":
        return "#FBBC04";
      default:
        return "#34A853";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "archived":
        return "Archived";
      case "completed":
        return "Completed";
      case "pending":
        return "Pending";
      default:
        return "Active";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const status = project.status || "active";

  return (
    <div
      className={`${styles.projectCard} rise-in`}
      style={{
        ["--status" as string]: getStatusColor(status),
        ["--i" as string]: Math.min(index, 12),
      }}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        // Enter/Space opens the project, but not when the "more options" button inside has focus.
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open project ${project.title}`}
    >
      <div className={styles.projectImage}>
        <ProjectBanner title={project.title} projectType={project.projectType} showLabel={false} />
        <span className={styles.statusTag}>
          <span className={styles.statusDot} aria-hidden="true" />
          {getStatusText(status)}
        </span>
        {project.ownershipType && (
          <span className={styles.ownerTag}>{project.ownershipType === "owned" ? "Owner" : "Member"}</span>
        )}
      </div>

      <div className={styles.projectContent}>
        <h3 className={styles.projectTitle} title={project.title}>{project.title}</h3>
        <div className={styles.projectMeta}>
          {project.projectType && (
            <span className={styles.metaChip}>
              <img src="/project-type-icon.svg" alt="" className={styles.metaIcon} />
              {formatType(project.projectType)}
            </span>
          )}
          {project.teamSize && (
            <span className={styles.metaChip}>
              <img src="/team-size-icon.svg" alt="" className={styles.metaIcon} />
              {formatTeamSize(project.teamSize)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.projectFooter}>
        <span className={styles.projectDate}>
          <img src="/calendar.svg" alt="" className={styles.metaIcon} />
          Created {formatDate(project.createdAt)}
        </span>
        {/* Clicks inside the menu must not also open the card. */}
        <div className={styles.moreOptions} ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`${styles.moreButton} ${showDropdown ? styles.moreButtonOpen : ""}`}
            onClick={handleMoreOptionsClick}
            aria-label={`More options for ${project.title}`}
            aria-haspopup="menu"
            aria-expanded={showDropdown}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <circle cx="4" cy="10" r="1.6" />
              <circle cx="10" cy="10" r="1.6" />
              <circle cx="16" cy="10" r="1.6" />
            </svg>
          </button>
          {showDropdown && (
            <div className={`${styles.dropdownMenu} pop-in`}>
              <button
                className={styles.dropdownItem}
                onClick={() => handleOptionClick(() => window.open(`/dashboard/projects/${project.id}`, '_blank'))}
              >
                View Details
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => handleOptionClick(onArchive)}
              >
                Archive
              </button>
              {project.ownershipType === "owned" && (
                <button
                  className={`${styles.dropdownItem} ${confirmDelete ? styles.dropdownDanger : ""}`}
                  onClick={handleDeleteClick}
                  disabled={deleting}
                  aria-live="polite"
                >
                  {deleting ? "Deleting..." : confirmDelete ? "Click again to delete" : "Delete"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** "HACKATHON" -> "Hackathon" */
function formatType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

/** Backend team-size enum -> readable range. */
function formatTeamSize(size: string) {
  const map: Record<string, string> = { OneThree: "1–3 people", FourSix: "4–6 people", SevenPlus: "7+ people" };
  return map[size] ?? size;
}