import { greetingFor, minuteOfDay } from '@kairo/core';
import { GlassSurface, Icon, Overlay, OverlayClose, status } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useUi } from '../store';

/**
 * Écran de l'assistant (maquette). L'assistant Llama arrive en Phase 2 : en attendant,
 * l'écran d'accueil de l'assistant s'affiche et la saisie est désactivée.
 */
export function Assistant() {
  const { t } = useTranslation('app');
  const { settings } = useAppData();
  const open = useUi((s) => s.assistant);
  const setAssistant = useUi((s) => s.setAssistant);
  const name = settings.profile.name;
  const greet = t(`today.greet.${greetingFor(minuteOfDay(new Date()))}`).replace(/,$/, '');

  return (
    <Overlay open={open} onClose={() => setAssistant(false)} label={t('assistant.title')}>
      <div
        aria-hidden="true"
        className="absolute -left-30 -top-50 size-95 animate-morph iridescent opacity-35 blur-[80px]"
      />
      <div className="relative mx-auto flex h-full max-w-120 flex-col">
        <div className="flex items-center gap-3 px-5 pb-3 pt-12.5">
          <span
            aria-hidden="true"
            className="size-9 flex-none animate-morph iridescent shadow-[0_0_24px_color-mix(in_oklab,var(--k-acc)_50%,transparent)]"
          />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-sub font-bold tracking-[-0.02em]">{t('assistant.title')}</span>
            <span className="flex items-center gap-1.5 mono-num text-micro tracking-[0.12em] text-ink3">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-pill"
                style={{ background: status.success, boxShadow: `0 0 8px ${status.success}` }}
              />
              {t('assistant.status')}{' '}
              {settings.options.local ? t('assistant.onPhone') : t('assistant.onServer')}
            </span>
          </span>
          <GlassSurface className="rounded-pill">
            <OverlayClose
              aria-label={t('assistant.close')}
              className="flex size-11 items-center justify-center rounded-pill"
            >
              <Icon name="close" size={16} />
            </OverlayClose>
          </GlassSurface>
        </div>

        <div className="no-scrollbar flex flex-1 flex-col gap-4.5 overflow-y-auto px-5 pb-4 pt-1">
          <div className="relative flex h-60 flex-none items-center justify-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute size-32.5 animate-ripple rounded-pill border-[1.5px] border-acc"
                style={{ animationDelay: `${i}s` }}
              />
            ))}
            <span
              aria-hidden="true"
              className="relative size-29.5 animate-morph iridescent shadow-[0_0_70px_color-mix(in_oklab,var(--k-acc)_55%,transparent)]"
            />
          </div>
          <h2 className="headline text-center text-big">
            {greet}
            {name ? `, ${name}` : ''}.
            <br />
            <em>{t('assistant.watch')}</em>
          </h2>
          <p className="m-0 text-center text-body leading-normal text-ink2">
            {t('assistant.soon')}
          </p>
        </div>

        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
          <GlassSurface
            level="thick"
            className="flex items-center gap-2 rounded-pill py-1.5 pl-4 pr-1.5 opacity-60"
          >
            <input
              disabled
              aria-label={t('assistant.message')}
              placeholder={t('assistant.placeholder')}
              className="h-11 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink3"
            />
            <button
              type="button"
              disabled
              aria-label={t('assistant.send')}
              className="flex size-11.5 flex-none items-center justify-center rounded-pill bg-acc text-acc-ink"
            >
              <Icon name="send" size={18} />
            </button>
          </GlassSurface>
        </div>
      </div>
    </Overlay>
  );
}
