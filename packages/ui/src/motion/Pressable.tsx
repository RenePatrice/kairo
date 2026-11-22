import { useHaptics } from '@kairo/platform';
import { motion, type HTMLMotionProps } from 'motion/react';
import type { MouseEvent, Ref } from 'react';
import { useAppearance } from '../appearance/context';
import { transitionFor } from './transitions';

export interface PressableProps extends HTMLMotionProps<'button'> {
  /** Petit retour haptique à l'appui (mobile). */
  haptic?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Bouton qui s'enfonce avec un ressort expressif, comme `.press` dans la maquette. */
export function Pressable({ haptic = false, onClick, type = 'button', ...rest }: PressableProps) {
  const { reduceMotion } = useAppearance();
  const haptics = useHaptics();
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (haptic) void haptics.selection();
    onClick?.(e);
  };
  return (
    <motion.button
      type={type}
      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
      transition={transitionFor('bouncy', reduceMotion)}
      onClick={handleClick}
      {...rest}
    />
  );
}
