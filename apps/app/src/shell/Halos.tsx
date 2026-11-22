/**
 * Les deux halos d'ambiance de la maquette : couleurs selon le moment de la journée,
 * et la couleur de l'activité en cours sur l'écran Aujourd'hui.
 */
export function Halos({ colors }: { colors: readonly [string, string] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-37.5 -top-57.5 size-120 animate-drift rounded-pill transition-[background] duration-1000"
        style={{
          background: `radial-gradient(circle, ${colors[0]} 0%, transparent 65%)`,
          opacity: 'var(--k-glow-op)',
        }}
      />
      <div
        className="absolute -right-52.5 top-75 size-110 animate-drift rounded-pill transition-[background] duration-1000 [animation-direction:reverse] [animation-duration:18s]"
        style={{
          background: `radial-gradient(circle, ${colors[1]} 0%, transparent 65%)`,
          opacity: 'var(--k-glow-op)',
        }}
      />
    </div>
  );
}
