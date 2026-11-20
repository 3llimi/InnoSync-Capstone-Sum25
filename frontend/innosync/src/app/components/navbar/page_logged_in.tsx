import Link from "next/link";
import styles from "./page.module.css";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "../common/Avatar";
import { clearMyProfile, getMyProfile } from "../common/myProfile";
import NotificationBell from "./NotificationBell";

/** Must match the `menu-out` animation length in page.module.css. */
const CLOSE_MS = 170;

interface NavbarUserProps {
  onLogout?: () => void;
}

interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  telegram: string;
  github: string;
  bio: string;
  position: string;
  education: string;
  expertise: string;
  expertiseLevel: string;
  resume: string;
  profilePicture: string;
  workExperience: Array<{
    startDate: string;
    endDate: string;
    position: string;
    company: string;
    description: string;
  }>;
  technologies: string[];
}

/** Used when /api/profile/me fails (e.g. a brand-new account without a profile yet). */
function fallbackProfile(): UserProfile {
  return {
    id: 0,
    email: localStorage.getItem("userEmail") || "",
    fullName: localStorage.getItem("userFullName") || "User",
    telegram: "",
    github: "",
    bio: "",
    position: "",
    education: "",
    expertise: "",
    expertiseLevel: "",
    resume: "",
    profilePicture: "",
    workExperience: [],
    technologies: [],
  };
}

const MENU_LINKS = [
  {
    href: "/dashboard/overview",
    label: "Dashboard",
    hint: "Overview and activity",
    icon: <><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>,
  },
  {
    href: "/dashboard/projects",
    label: "My projects",
    hint: "Owned and joined",
    icon: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>,
  },
  {
    href: "/dashboard/invitations",
    label: "Invitations",
    hint: "Offers from teams",
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  },
  {
    href: "/components/about",
    label: "About InnoSync",
    hint: "How matching works",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  },
];

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const NavbarUser: React.FC<NavbarUserProps> = ({ onLogout }) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Stays true while the close animation plays, so the menu can animate out before unmounting.
  const [showDropdown, setShowDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Shared with the dashboard header / profile panel / overview: one request, not four.
    const load = async (fresh: boolean) => {
      if (!localStorage.getItem("token")) {
        setLoading(false);
        return;
      }
      const result = await getMyProfile({ fresh });
      if (result.ok) {
        setUserProfile(result.data as unknown as UserProfile);
      } else if (result.status !== 0) {
        console.error("Failed to fetch user profile:", result.status);
        setUserProfile(fallbackProfile());
      } else {
        console.error("Error fetching user profile: network error");
      }
      setLoading(false);
    };

    load(false);
    // The profile or the signed-in user changed: skip the cache.
    const reload = () => load(true);
    window.addEventListener("profileUpdated", reload);
    window.addEventListener("authStateChanged", reload);
    return () => {
      window.removeEventListener("profileUpdated", reload);
      window.removeEventListener("authStateChanged", reload);
    };
  }, []);

  // "Priya Nair" -> "P.Nair"
  const getDisplayName = (fullName: string) => {
    if (!fullName) return "User";
    const nameParts = fullName.trim().split(" ");
    if (nameParts.length === 1) return nameParts[0];
    return `${nameParts[0].charAt(0)}.${nameParts[nameParts.length - 1]}`;
  };

  useEffect(() => {
    if (menuOpen) {
      setShowDropdown(true);
      return;
    }
    if (!showDropdown) return;
    const timeout = setTimeout(() => setShowDropdown(false), CLOSE_MS);
    return () => clearTimeout(timeout);
  }, [menuOpen, showDropdown]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !userMenuRef.current?.contains(target)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        userMenuRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    const refreshToken = localStorage.getItem("refreshToken");

    // Always clear local storage and trigger UI updates, even if the API call fails.
    const clearAuthAndUpdateUI = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userFullName");
      clearMyProfile();
      window.dispatchEvent(new CustomEvent("authStateChanged"));
      if (onLogout) onLogout();
      router.push("/");
    };

    if (!refreshToken) {
      clearAuthAndUpdateUI();
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) console.error("Logout failed:", await response.text());
    } catch (err) {
      console.error("Error during logout:", err);
    } finally {
      clearAuthAndUpdateUI();
    }
  };

  const fullName = userProfile?.fullName || "User";
  const avatarSrc =
    userProfile?.profilePicture && userProfile.id
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userProfile.id}/picture`
      : null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        {/* Logo */}
        <div className={styles.logo}>
          <Link href="/" className={styles.logoLink}>
            <span className={styles.logoText}>Inno</span>Sync
          </Link>
        </div>

        {/* Navigation Links */}
        <div className={styles.navLinks}>
          <div className={styles.navItem}>
            <Link href="/components/projects" className={styles.navLink}>
              Find Project
            </Link>
            <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={styles.navItem}>
            <Link href="/components/talent" className={styles.navLink}>
              Find Talent
            </Link>
            <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={styles.navItem}>
            <Link href="/components/about" className={styles.navLink}>
              About Us
            </Link>
            <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Bell + account menu */}
        <div className={styles.authButtons}>
          <div className={styles.userInfo}>
            <NotificationBell />
            <button
              type="button"
              ref={userMenuRef}
              className={`${styles.userMenu} ${menuOpen ? styles.userMenuOpen : ""}`}
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              {loading ? (
                <span className="skeleton" style={{ display: "inline-block", width: 34, height: 34, borderRadius: "50%" }} aria-hidden="true" />
              ) : (
                <Avatar name={fullName} src={avatarSrc} size={34} />
              )}
              <span className={styles.userName}>
                {loading ? <span className="skeleton" style={{ display: "inline-block", width: 64, height: 16 }} aria-hidden="true" /> : getDisplayName(fullName)}
              </span>
              <svg className={styles.userChevron} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showDropdown && (
              <div
                className={`${styles.userDropdown} ${menuOpen ? styles.userDropdownOpen : styles.userDropdownClose}`}
                ref={menuRef}
                role="menu"
                aria-label="Account"
              >
                <div className={styles.userDropdownHeader}>
                  <Avatar name={fullName} src={avatarSrc} size={46} />
                  <div className={styles.userDropdownWho}>
                    <div className={styles.userDropdownName}>
                      {loading ? <span className="skeleton" style={{ display: "inline-block", width: 110, height: 16 }} aria-hidden="true" /> : fullName}
                    </div>
                    <div className={styles.userDropdownEmail}>
                      {loading ? <span className="skeleton" style={{ display: "inline-block", width: 150, height: 12 }} aria-hidden="true" /> : userProfile?.email || ""}
                    </div>
                  </div>
                </div>

                <div className={styles.userDropdownList}>
                  {MENU_LINKS.map((item, i) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={styles.userDropdownItem}
                      style={{ ["--i" as string]: i }}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className={styles.userDropdownIcon}><MenuIcon>{item.icon}</MenuIcon></span>
                      <span className={styles.userDropdownText}>
                        <b>{item.label}</b>
                        <small>{item.hint}</small>
                      </span>
                      <span className={styles.userDropdownArrow} aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>

                <div className={styles.userDropdownDivider} />

                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.userDropdownItem} ${styles.userDropdownDanger}`}
                  style={{ ["--i" as string]: MENU_LINKS.length }}
                  onClick={handleLogout}
                >
                  <span className={styles.userDropdownIcon}>
                    <MenuIcon><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></MenuIcon>
                  </span>
                  <span className={styles.userDropdownText}>
                    <b>Sign out</b>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarUser;
