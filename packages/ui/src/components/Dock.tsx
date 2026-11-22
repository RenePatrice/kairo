import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../appearance/context';
import { GlassSurface } from '../glass/GlassSurface';
import { Pressable } from '../motion/Pressable';
import { transitionFor } from '../motion/transitions';
import { orbCore } from '../tokens';
import { Icon } from './Icon';
import type { IconName } from './icons';

export interface DockTab {
  id: string;
  label: string;
  icon: IconName;
}

export interface DockProps {
  tabs: readonly DockTab[];
  current: string;
  onSelect: (id: string) => void;
  /** Ouvre l'assistant (orbe irisé central). */
  onAssistant: () => void;
  className?: string;
}

/**
 * Navigation principale en verre : capsule flottante en bas sur téléphone, avec l'orbe de
 * l'assistant au centre (maquette) ; barre latérale verticale sur ordinateur (≥ 1024 px).
 */
export function Dock({ tabs, current, onSelect, onAssistant, className = '' }: DockProps) {
  const { t } = useTranslation('ui');
  const { reduceMotion } = useAppearance();
  const half = Math.ceil(tabs.length / 2);

  const renderTab = (tab: DockTab) => {
    const active = tab.id === current;
    return (
      <li key={tab.id} className="desktop:w-full">
        <Pressable
          haptic
          onClick={() => onSelect(tab.id)}
          aria-current={active ? 'page' : undefined}
          className={`relative flex h-15 w-full flex-col items-center justify-center gap-1 rounded-pill desktop:h-12 desktop:flex-row desktop:justify-start desktop:gap-3 desktop:px-4 ${
            active ? 'text-ink' : 'text-ink3'
          }`}
        >
          {active ? (
            <motion.span
              layoutId="dock-active"
              aria-hidden="true"
              className="absolute inset-1 -z-10 rounded-pill bg-card-hi/60"
              transition={transitionFor('interaction', reduceMotion)}
            />
          ) : null}
          <Icon name={tab.icon} />
          <span className="text-micro font-semibold desktop:text-small">{tab.label}</span>
        </Pressable>
      </li>
    );
  };

  const orb = (
    <li className="flex justify-center desktop:order-first desktop:mb-2 desktop:justify-start desktop:px-2">
      <Pressable
        haptic
        onClick={onAssistant}
        aria-label={t('nav.assistant')}
        className="relative -mt-8 flex size-17 items-center justify-center rounded-pill desktop:mt-0 desktop:size-14"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-morph iridescent"
          style={{
            boxShadow: '0 10px 40px color-mix(in oklab, var(--color-acc) 55%, transparent)',
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-[5px] rounded-pill"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${orbCore[0]}, ${orbCore[1]} 70%)`,
          }}
        />
        <Icon name="sparkle" size={24} className="relative text-white" />
      </Pressable>
    </li>
  );

  return (
    <GlassSurface
      as="nav"
      level="regular"
      aria-label={t('nav.main')}
      className={`rounded-pill px-1.5 desktop:rounded-panel desktop:px-2 desktop:py-4 ${className}`}
    >
      <ul className="grid grid-cols-[1fr_1fr_5.25rem_1fr_1fr] items-center desktop:flex desktop:flex-col desktop:items-stretch desktop:gap-1">
        {tabs.slice(0, half).map(renderTab)}
        {orb}
        {tabs.slice(half).map(renderTab)}
      </ul>
    </GlassSurface>
  );
}
