'use client';
import { useState, useEffect, useRef } from "react";
//import { useRouter } from "next/navigation";
import styles from "./QuickSyncPage.module.css";
import Image from 'next/image';
import { toast } from 'react-toastify';
import Avatar from "../../common/Avatar";
import { SkeletonGroup, SkeletonPerson } from "../../common/Skeleton";

// API Response Interfaces
interface WorkExperience {
  startDate: string;
  endDate: string;
  position: string;
  company: string;
  description: string;
}

interface ApiMember {
  id: number;
  bio: string;
  position: string;
  education: string;
  expertise: string;
  technologies: string[];
  expertise_level: string;
  experience_years: string;
  work_experience: WorkExperience[];
  role_match_score: number;
}

interface SynergyMetrics {
  avg_synergy: number;
  shared_skills: number;
  experience_variance: number;
}

interface TeamRecommendationResponse {
  project_id: string;
  team_score: number;
  synergy_score: number;
  combined_score: number;
  members: ApiMember[];
  synergy_metrics: SynergyMetrics;
  recommendation_notes: string[];
}

// Project interface for GET /api/projects/me
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  // Add other project fields as needed
}

// Profile interface for GET /api/profile/all
interface Profile {
  id: number;
  user_id?: number;
  email: string;
  fullName: string;
  telegram: string;
  github: string;
  bio: string;
  position: string;
  education: string;
  expertise: string;
  resume: string;
  profilePicture: string;
  technologies: string[];
  expertise_level: string;
  experience_years: string;
  work_experience: WorkExperience[];
}

// Project Role interface for GET /api/projects/{projectId}/roles
interface ProjectRole {
  id: number;
  roleName: string;
  expertiseLevel: string;
  technologies: string[];
}

// UI Interface (keeping existing structure)
interface Candidate {
  /** Profile id: what the ML service uses to identify people. */
  id: string;
  /** User account id: what invitations must be sent to (differs from the profile id). */
  userId: number | null;
  name: string;
  role: string;
  level: "Entry" | "Junior" | "Mid" | "Senior" | "Researcher";
  education: "No Degree" | "Bachelor" | "Master" | "PhD";
  experience: string;
  email: string;
  bio: string;
  skills: string[];
  positions: string[];
  avatar: string | null;
}

const QuickSyncPage = () => {
  //const router = useRouter();

  // State for API data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for UI candidates (transformed from API data)
  const [currentCandidates, setCurrentCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [contactingCandidate, setContactingCandidate] = useState<string | null>(null);
  const [noTalentMatch, setNoTalentMatch] = useState(false);
  // Which reroll is running: 'all', a candidate id, or null.
  const [rerolling, setRerolling] = useState<string | null>(null);
  // Candidates that just arrived from a reroll (briefly highlighted).
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  // Context reused by rerolls, so they don't refetch profiles and projects.
  const profilesRef = useRef<Profile[]>([]);
  const projectIdRef = useRef<string | null>(null);

  // Helper function to map API education to UI format
  const mapEducation = (education: string): "No Degree" | "Bachelor" | "Master" | "PhD" => {
    switch (education) {
      case "NO_DEGREE":
        return "No Degree";
      case "BACHELOR":
        return "Bachelor";
      case "MASTER":
        return "Master";
      case "PHD":
        return "PhD";
      default:
        return "No Degree";
    }
  };

  // Helper function to map API expertise level to UI format
  const mapExpertiseLevel = (level: string): "Entry" | "Junior" | "Mid" | "Senior" | "Researcher" => {
    switch (level) {
      case "ENTRY":
        return "Entry";
      case "JUNIOR":
        return "Junior";
      case "MID":
        return "Mid";
      case "SENIOR":
        return "Senior";
      case "RESEARCHER":
        return "Researcher";
      default:
        return "Entry";
    }
  };

  // Helper function to map experience years to readable format
  const mapExperienceYears = (years: string): string => {
    switch (years) {
      case "ZERO_TO_ONE":
        return "< 1 y.";
      case "ONE_TO_THREE":
        return "1-3 y.";
      case "THREE_TO_FIVE":
        return "3-5 y.";
      case "FIVE_TO_SEVEN":
        return "5-7 y.";
      case "SEVEN_TO_TEN":
        return "7-10 y.";
      case "MORE_THAN_TEN":
        return "10+ y.";
      default:
        return "< 1 y.";
    }
  };

  // Transform API member to UI candidate
  const transformApiMemberToCandidate = (member: ApiMember, profiles: Profile[]): Candidate => {
    // Find the corresponding profile for this member
    const profile = profiles.find(p => p.id === member.id);
    const fullName = profile?.fullName || `User ${member.id}`;
    const email = profile?.email || `user${member.id}@example.com`;

    // Only request a photo when the profile has one; otherwise Avatar shows initials (no 404).
    const avatarUrl = profile?.profilePicture
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${member.id}/picture`
      : null;

    return {
      id: member.id.toString(),
      userId: profile?.user_id ?? null,
      name: fullName, // Use real name from profile
      role: member.position,
      level: mapExpertiseLevel(member.expertise_level),
      education: mapEducation(member.education),
      experience: mapExperienceYears(member.experience_years),
      email: email, // Use real email from profile
      bio: member.bio,
      skills: member.technologies,
      positions: [member.position], // Using position as the main position
      avatar: avatarUrl, // Use real profile picture
    };
  };

  // Fetch all profiles from API
  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const profilesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!profilesResponse.ok) {
        throw new Error(`Failed to fetch profiles: ${profilesResponse.status}`);
      }

      const profilesData: Profile[] = await profilesResponse.json();
      return profilesData;
    } catch (err) {
      console.error('Error fetching profiles:', err);
      // Don't throw error here, just return empty array
      return [];
    }
  };

  // Ask the ML service for a team. A reroll sends a fresh seed plus who to avoid / keep.
  const requestTeam = async (
    projectId: string,
    extra: { seed?: number; exclude_ids?: number[]; keep_ids?: number[] } = {}
  ): Promise<ApiMember[] | null> => {
    const token = localStorage.getItem('token');
    const mlUrl = process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8000';
    const res = await fetch(`${mlUrl}/recommend-team`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, ...extra }),
    });
    if (res.status === 400) return null;
    if (!res.ok) throw new Error(`Failed to fetch team recommendations: ${res.status}`);
    const data: TeamRecommendationResponse = await res.json();
    return data.members;
  };

  const randomSeed = () => 1 + Math.floor(Math.random() * 1_000_000);

  // Fetch team recommendations from API
  const fetchTeamRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoTalentMatch(false);

      // First, fetch all profiles to get real names
      const profilesData = await fetchProfiles();
      profilesRef.current = profilesData;

      // Then, get the user's projects to find the last created project
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const projectsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
      }

      const projects: Project[] = await projectsResponse.json();

      if (projects.length === 0) {
        throw new Error('No projects found. Please create a project first.');
      }

      // Get the last created project (assuming projects are sorted by creation date)
      const lastProject = projects[projects.length - 1];
      projectIdRef.current = lastProject.id;

      // Now fetch team recommendations using the last project ID
      const members = await requestTeam(lastProject.id);
      if (!members) {
        setNoTalentMatch(true);
        setCurrentCandidates([]);
        return;
      }

      // Transform API members to candidates
      const candidates = members.map(member => transformApiMemberToCandidate(member, profilesData));
      setCurrentCandidates(candidates);

      // Set the first candidate as selected
      if (candidates.length > 0) {
        setSelectedCandidate(candidates[0]);
      }

    } catch (err) {
      console.error('Error fetching team recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchTeamRecommendations();
  }, []);

  // Reroll the whole team: explore new candidate teams and avoid the current members where
  // someone else fits the role. The list stays on screen; only the cards that change animate in.
  const rerollAllCandidates = async () => {
    const projectId = projectIdRef.current;
    if (!projectId || rerolling) return;
    setRerolling('all');
    try {
      const currentIds = currentCandidates.map(c => Number(c.id));
      const members = await requestTeam(projectId, { seed: randomSeed(), exclude_ids: currentIds });
      if (!members || members.length === 0) {
        toast.info('No other team could be formed for your roles right now.');
        return;
      }
      const next = members.map(m => transformApiMemberToCandidate(m, profilesRef.current));
      const changed = next.filter(c => !currentIds.includes(Number(c.id))).length;
      if (changed === 0) {
        toast.info('This is the only team that matches your roles right now. Add more talents or roles to see alternatives.');
        return;
      }
      setFreshIds(new Set(next.filter(c => !currentIds.includes(Number(c.id))).map(c => c.id)));
      setCurrentCandidates(next);
      setSelectedCandidate(next[0]);
      toast.success(changed === next.length ? 'New team suggested.' : `${changed} of ${next.length} members replaced.`);
    } catch (err) {
      toast.error((err as Error).message || 'Reroll failed');
    } finally {
      setRerolling(null);
    }
  };

  // Reroll one person: everyone else stays, only this slot gets a new candidate.
  const rerollSingleCandidate = async (candidate: Candidate) => {
    const projectId = projectIdRef.current;
    if (!projectId || rerolling) return;
    setRerolling(candidate.id);
    try {
      const keep = currentCandidates.filter(c => c.id !== candidate.id).map(c => Number(c.id));
      const members = await requestTeam(projectId, {
        seed: randomSeed(),
        exclude_ids: [Number(candidate.id)],
        keep_ids: keep,
      });
      const replacement = members?.find(m => !keep.includes(m.id));
      if (!replacement || String(replacement.id) === candidate.id) {
        toast.info(`No other ${candidate.role} is available right now.`);
        return;
      }
      const newcomer = transformApiMemberToCandidate(replacement, profilesRef.current);
      setCurrentCandidates(list => list.map(c => (c.id === candidate.id ? newcomer : c)));
      setSelectedCandidate(newcomer);
      setFreshIds(new Set([newcomer.id]));
      toast.success(`${newcomer.name} suggested as ${newcomer.role}.`);
    } catch (err) {
      toast.error((err as Error).message || 'Reroll failed');
    } finally {
      setRerolling(null);
    }
  };

  const selectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleContact = async (candidate: Candidate) => {
    setContactingCandidate(candidate.id);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      // Get the user's projects (should be only their own)
      const projectsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!projectsResponse.ok) {
        throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
      }

      const projects: Project[] = await projectsResponse.json();
      if (projects.length === 0) {
        throw new Error('No projects found. Please create a project first.');
      }

      const lastProject = projects[projects.length - 1];

      // Get roles for the last project
      const rolesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${lastProject.id}/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!rolesResponse.ok) {
        throw new Error(`Failed to fetch project roles: ${rolesResponse.status}`);
      }

      const roles: ProjectRole[] = await rolesResponse.json();
      if (!roles.length) {
        toast.error("No roles found for your project.");
        return;
      }

      // Find the role that matches both position and at least one technology
      const matchingRole = roles.find((role: ProjectRole) => {
        const roleNameMatch = role.roleName.toLowerCase() === candidate.role.toLowerCase();
        const techMatch = role.technologies.some(
          tech => candidate.skills.map(s => s.toLowerCase()).includes(tech.toLowerCase())
        );
        return roleNameMatch && techMatch;
      });
      if (!matchingRole) {
        toast.error("No matching role found for this candidate's position and skills.");
        return;
      }

      // Send invitation to the candidate's user account (candidate.id is their profile id).
      if (candidate.userId == null) {
        toast.error("Couldn't find this candidate's account. Please refresh and try again.");
        return;
      }
      const payload = {
        projectRoleId: Number(matchingRole.id),
        recipientId: candidate.userId
      };

      const invitationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (invitationResponse.status === 409) {
        toast.error("An invitation for this user and role already exists.");
        return;
      }
      if (!invitationResponse.ok) throw new Error("Failed to send invitation");

      toast.success(`Invitation sent successfully to ${candidate.name}!`, {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
      });
    } catch (err) {
      toast.error((err as Error).message || "Failed to send invitation", {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
      });
    } finally {
      setContactingCandidate(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.browserContent}>
          <SkeletonGroup label="Finding your best team matches">
            <div style={{ maxWidth: 984, margin: '0 auto', width: '100%' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 24px 4px', color: '#298217', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
              <span className="spinner" aria-hidden="true" />
              Finding your best team matches...
            </p>
            {[0, 1, 2, 3].map((i) => <SkeletonPerson key={i} index={i} />)}
            </div>
          </SkeletonGroup>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.browserContent}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'red' }}>Error: {error}</div>
            <button
              onClick={() => fetchTeamRecommendations()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No talent match state
  if (noTalentMatch) {
    return (
      <div className={styles.container}>
        <div className={styles.browserContent}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: '#64748b', fontSize: 20 }}>No talent match for desired roles.</div>
            <button
              onClick={() => fetchTeamRecommendations()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No candidates state
  if (currentCandidates.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.browserContent}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <div>No team members found.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* <div className={styles.content}> */}
        <div className={styles.browserContent}>
          {/* Candidates List */}
          <div className={styles.candidatesSection}>
            <div className={styles.candidatesList}>
              {currentCandidates.map((candidate, index) => (
                <div
                  key={`${candidate.id}-${index}`}
                  className={`${styles.candidateCard} rise-in ${selectedCandidate?.id === candidate.id ? styles.selected : ""} ${freshIds.has(candidate.id) ? styles.fresh : ""} ${rerolling === candidate.id || rerolling === 'all' ? styles.rerollingCard : ""}`}
                  style={{ ["--i" as string]: Math.min(index, 10) }}
                  onClick={() => selectCandidate(candidate)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                      e.preventDefault();
                      selectCandidate(candidate);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedCandidate?.id === candidate.id}
                  aria-label={`View ${candidate.name}, ${candidate.role}`}
                >
                  {/* Avatar */}
                  <div className={styles.candidateAvatarFigma}>
                    <Avatar name={candidate.name} src={candidate.avatar} size={56} interactive />
                  </div>
                  {/* Info */}
                  <div className={styles.candidateInfoFigma}>
                    <div className={styles.candidateHeadingRow}>
                      <span className={styles.candidateNameFigma}>{candidate.name}</span>
                      <span className={styles.roleBadge}>{candidate.role}</span>
                    </div>
                    <div className={styles.detailBadgesFigma}>
                      {/* Level */}
                      <span className={styles.detailBadge} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <Image src="/verified.svg" alt="verified icon" width={24} height={24} style={{marginRight: 4}} />
                        {candidate.level}
                      </span>
                      {/* Education */}
                      <span className={styles.detailBadge} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <Image src="/education.svg" alt="education icon" width={20} height={20} style={{marginRight: 4}} />
                        {candidate.education}
                      </span>
                      {/* Experience */}
                      <span className={styles.detailBadge} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <Image src="/stars.svg" alt="experience icon" width={24} height={24} style={{marginRight: 4}} />
                        {candidate.experience}
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className={styles.candidateActionsFigma}>
                    <button
                      className={styles.rerollBtnFigma}
                      onClick={selectedCandidate?.id === candidate.id ? (e => {
                        e.stopPropagation();
                        rerollSingleCandidate(candidate);
                      }) : (e => e.preventDefault())}
                      tabIndex={selectedCandidate?.id === candidate.id ? 0 : -1}
                      aria-disabled={selectedCandidate?.id !== candidate.id || !!rerolling}
                      aria-busy={rerolling === candidate.id}
                      aria-label={`Suggest someone else instead of ${candidate.name}`}
                    >
                      <Image
                        src="/refresh.svg"
                        alt=""
                        width={24}
                        height={24}
                        style={{ marginRight: 8 }}
                        className={rerolling === candidate.id ? styles.spinIcon : undefined}
                      />
                      {rerolling === candidate.id ? 'FINDING...' : 'REROLL'}
                    </button>
                    <button
                      className={styles.contactBtnFigma}
                      onClick={selectedCandidate?.id === candidate.id ? (e => {
                        e.stopPropagation();
                        handleContact(candidate);
                      }) : (e => e.preventDefault())}
                      tabIndex={selectedCandidate?.id === candidate.id ? 0 : -1}
                      aria-disabled={selectedCandidate?.id !== candidate.id || contactingCandidate === candidate.id}
                      disabled={contactingCandidate === candidate.id}
                    >
                      {contactingCandidate === candidate.id ? 'SENDING...' : 'CONTACT'}
                      <Image src="/sync_arrow.svg" alt="arrow right icon" width={24} height={24} style={{marginLeft: 8}} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className={styles.rerollAllBtn}
              onClick={rerollAllCandidates}
              disabled={!!rerolling}
              aria-busy={rerolling === 'all'}
            >
              <span className={`${styles.rerollAllBtnIcon} ${rerolling === 'all' ? styles.spinIcon : ''}`}>
                <Image src="/reroll.svg" alt="" width={24} height={24} />
              </span>
              <span className={styles.rerollAllBtnText}>{rerolling === 'all' ? 'Finding a new team...' : 'Reroll All'}</span>
            </button>
          </div>

          {/* Selected Candidate Profile */}
          {selectedCandidate && (
            <div className={styles.profileSection}>
              <div className={styles.profileCard}>
                {/* Avatar */}
                <div className={styles.profileHeader}>
                <div className={styles.profileAvatar}>
                  <Avatar name={selectedCandidate.name} src={selectedCandidate.avatar} size={120} />
                </div>
                  {/* Name */}
                  <h2 className={styles.profileName}>{selectedCandidate.name}</h2>
                  {/* Badges Row (Figma style) */}
                  <div className={styles.profileBadges} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', margin: '16px 0' }}>
                    {/* Level */}
                    <span className={styles.detailBadge} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', color: '#6C7278', borderRadius: 20, padding: '4px 16px', fontWeight: 500, fontSize: 15 }}>
                      <Image src="/verified.svg" alt="verified icon" width={24} height={24} style={{ marginRight: 4 }} />
                      {selectedCandidate.level}
                    </span>
                    {/* Education */}
                    <span className={styles.detailBadge} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', color: '#6C7278', borderRadius: 20, padding: '4px 16px', fontWeight: 500, fontSize: 15 }}>
                      <Image src="/education.svg" alt="education icon" width={20} height={20} style={{ marginRight: 4 }} />
                      {selectedCandidate.education}
                    </span>
                    {/* Experience */}
                    <span className={styles.detailBadge} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', color: '#6C7278', borderRadius: 20, padding: '4px 16px', fontWeight: 500, fontSize: 15 }}>
                      <Image src="/stars.svg" alt="experience icon" width={24} height={24} style={{ marginRight: 4 }} />
                      {selectedCandidate.experience}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                <div className={styles.profileInfo}>
                  <p className={styles.profileBio} style={{ textAlign: 'left', color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px 0' }}>{selectedCandidate.bio}</p>

                  <div className={styles.profileSections}>
                    {/* Skills Section */}
                    <div className={styles.skillsSection}>
                      <h4 className={styles.sectionTitle}>Skills</h4>
                      <div className={styles.tagsList}>
                        {selectedCandidate.skills.map((skill, index) => (
                          <span key={index} className={styles.skillTag}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Positions Section */}
                    <div className={styles.positionsSection}>
                      <h4 className={styles.sectionTitle}>Positions</h4>
                      <div className={styles.tagsList}>
                        {selectedCandidate.positions.map((position, index) => (
                          <span key={index} className={styles.positionTag}>
                            {position}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* <div className={styles.actions}>
          <button
            className={styles.skipButton}
            onClick={handleSkip}
          >
            Skip for Now
          </button>
          <button
            className={styles.inviteButton}
            onClick={handleSendInvitations}
          >
            Send Invitations
          </button>
        </div> */}
      {/* </div> */}
    </div>
  );
};

export default QuickSyncPage;
