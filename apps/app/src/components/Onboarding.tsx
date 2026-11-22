import type { ReactNode } from 'react';

/** Indicateur des 3 étapes de l'accueil : l'étape courante est une barre plus longue. */
export function StepDots({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div aria-hidden="true" className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1 rounded-xs transition-[width] duration-300 ${
            i === step ? 'w-7 bg-ink' : i < step ? 'w-3 bg-ink3' : 'w-3 bg-track'
          }`}
        />
      ))}
    </div>
  );
}

/** Mise en page commune des étapes d'accueil. */
export function OnboardingStep({ children, gap = 'gap-5' }: { children: ReactNode; gap?: string }) {
  return <div className={`flex flex-col ${gap}`}>{children}</div>;
}
