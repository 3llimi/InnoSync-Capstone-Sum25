// Sits between the dashboard layout and each tab, so only the tab content re-mounts and fades in
// while the profile panel and header stay mounted (no re-fetch, no flicker).
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
