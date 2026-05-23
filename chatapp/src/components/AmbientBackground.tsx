// ═══════════════════════════════════════════════════════════════════
//  AmbientBackground — Floating blur orbs
// ═══════════════════════════════════════════════════════════════════

export default function AmbientBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}
