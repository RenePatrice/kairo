import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../appearance/context';
import { GlassSurface } from '../glass/GlassSurface';
import { Pressable } from '../motion/Pressable';
import { transitionFor } from '../motion/transitions';
import { Icon } from './Icon';

export interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** Suggestions contextuelles (« Analyse ma semaine »…). */
  suggestions?: readonly string[];
  onSuggestion?: (suggestion: string) => void;
  /** Dictée vocale en cours. Absent = pas de bouton micro. */
  listening?: boolean;
  onToggleVoice?: () => void;
  /** L'IA prépare une réponse. */
  thinking?: boolean;
  /** Raccourci Ctrl/⌘ + K pour donner le focus (ordinateur). */
  shortcut?: boolean;
  className?: string;
}

/**
 * Barre de commande flottante en verre épais. Contour irisé (réservé à l'IA) quand elle est active.
 * L'IA propose, l'utilisateur valide : cette barre ne fait qu'envoyer la demande.
 */
export function CommandBar({
  value,
  onChange,
  onSubmit,
  suggestions = [],
  onSuggestion,
  listening = false,
  onToggleVoice,
  thinking = false,
  shortcut = true,
  className = '',
}: CommandBarProps) {
  const { t } = useTranslation('ui');
  const { reduceMotion } = useAppearance();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const suggestionsId = useId();
  const active = focused || listening || thinking;

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (text) onSubmit(text);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <AnimatePresence initial={false}>
        {suggestions.length > 0 && !thinking ? (
          <motion.ul
            id={suggestionsId}
            aria-label={t('command.suggestions')}
            className="flex gap-2 overflow-x-auto px-1 pb-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={transitionFor('interaction', reduceMotion)}
          >
            {suggestions.map((s) => (
              <li key={s} className="flex-none">
                <GlassSurface level="thin" as="span" className="block rounded-pill">
                  <Pressable
                    className="min-h-11 rounded-pill px-4 text-small font-medium text-ink2"
                    onClick={() => (onSuggestion ?? onSubmit)(s)}
                  >
                    {s}
                  </Pressable>
                </GlassSurface>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>

      <div className="relative rounded-pill p-[1.5px]">
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded-pill iridescent transition-opacity duration-300 ${
            active ? 'animate-spin-iri opacity-90' : 'opacity-0'
          }`}
        />
        <GlassSurface
          as="div"
          level="thick"
          className="flex h-15 items-center gap-2 rounded-pill pl-2 pr-2"
        >
          <form role="search" onSubmit={submit} className="flex flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              className="relative flex size-11 flex-none items-center justify-center"
            >
              <span className="absolute inset-1 rounded-pill iridescent animate-morph" />
              <span className="absolute inset-[7px] rounded-pill bg-bg2" />
              <Icon name="sparkle" size={18} className="relative text-ink" />
            </span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label={t('command.label')}
              placeholder={
                listening
                  ? t('command.listening')
                  : thinking
                    ? t('command.thinking')
                    : t('command.placeholder')
              }
              enterKeyHint="send"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-input text-ink outline-none placeholder:text-ink3"
            />
            {onToggleVoice ? (
              <Pressable
                haptic
                onClick={onToggleVoice}
                aria-label={listening ? t('command.stopListening') : t('command.listen')}
                aria-pressed={listening}
                className={`flex size-11 flex-none items-center justify-center rounded-pill ${
                  listening ? 'bg-acc text-acc-ink' : 'text-ink2'
                }`}
              >
                <Icon name="mic" size={20} className={listening ? 'animate-pulse-soft' : ''} />
              </Pressable>
            ) : null}
            <Pressable
              type="submit"
              haptic
              disabled={!value.trim() || thinking}
              aria-label={t('command.send')}
              className="flex size-11 flex-none items-center justify-center rounded-pill bg-inv text-inv-ink disabled:opacity-40"
            >
              <Icon name="send" size={20} />
            </Pressable>
          </form>
        </GlassSurface>
      </div>
      <span role="status" className="sr-only">
        {thinking ? t('command.thinking') : listening ? t('command.listening') : ''}
      </span>
    </div>
  );
}
