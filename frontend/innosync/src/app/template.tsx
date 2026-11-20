// Re-mounts when moving between top-level sections, giving each page a soft fade-in.
// Opacity only: a transform here would break `position: fixed` descendants (modals, toasts).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
