import type { AiSuggestion } from '@kairo/ai';
import { durationMin, greetingFor, minuteOfDay, stableRandom } from '@kairo/core';
import {
  Button,
  GlassSurface,
  Icon,
  Overlay,
  OverlayClose,
  Pressable,
  activityPalette,
  inkFor,
  status,
  transitionFor,
  useAppearance,
  withAlpha,
} from '@kairo/ui';
import { motion } from 'motion/react';
import { useSpeech } from '@kairo/platform';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssistant, useInsights } from '../lib/assistant';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useNow } from '../lib/useNow';
import { AppToast } from '../shell/AppToast';
import { useUi, type AiMessage } from '../store';

type AiReply = Extract<AiMessage, { role: 'ai' }>;
type Assistant = ReturnType<typeof useAssistant>;

/** Onde du micro (maquette : 18 barres, hauteurs et vitesses variées, toujours les mêmes). */
const WAVE = Array.from({ length: 18 }, (_, i) => ({
  key: i,
  h: 8 + Math.round(stableRandom(`w${i}`) * 22),
  d: Number((0.35 + stableRandom(`d${i}`) * 0.5).toFixed(2)),
}));

const tile = (key: string) => activityPalette.find((c) => c.key === key)?.hex ?? status.success;

/** Écran plein de l'assistant, ouvert par l'orbe du Dock (maquette : « ASSISTANT »). */
export function Assistant() {
  const { t } = useTranslation('app');
  const { settings, categories } = useAppData();
  const open = useUi((s) => s.assistant);
  const chat = useUi((s) => s.chat);
  const setAssistant = useUi((s) => s.setAssistant);
  const patchChat = useUi((s) => s.patchChat);
  const newChat = useUi((s) => s.newChat);
  const assistant = useAssistant();
  const now = useNow(30_000);
  const scroller = useRef<HTMLDivElement>(null);
  const { reduceMotion } = useAppearance();
  const f = useFormat();
  const speech = useSpeech();
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    void speech.available().then(setCanSpeak);
  }, [speech]);

  /** Micro : écoute une phrase et la place dans le champ, à relire avant d'envoyer. */
  const mic = async () => {
    if (useUi.getState().chat.listening) {
      await speech.stop();
      patchChat({ listening: false });
      return;
    }
    patchChat({ listening: true });
    const heard = await speech.listen(f.locale);
    patchChat({ listening: false, ...(heard ? { text: heard } : {}) });
  };

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [chat.msgs.length, chat.thinking, reduceMotion]);

  const first = categories[0]?.name;
  const chips = chat.msgs.length
    ? [t('assistant.reply.myFree'), t('assistant.tiles.analyzeQ'), t('assistant.tiles.reviewQ')]
    : first
      ? [
          t('assistant.chips.tomorrow', { name: first }),
          t('assistant.chips.reading'),
          t('assistant.chips.hours'),
        ]
      : [t('assistant.chips.shifts'), t('assistant.chips.revisions'), t('assistant.chips.gym')];

  return (
    <Overlay open={open} onClose={() => setAssistant(false)} label={t('assistant.title')}>
      <div
        aria-hidden="true"
        className="absolute -left-30 -top-50 size-95 animate-morph iridescent opacity-35 blur-[80px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-40 top-30 size-75 animate-spin-iri iridescent opacity-[0.18] blur-[90px]"
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
          {chat.msgs.length ? (
            <GlassSurface className="rounded-pill">
              <Pressable
                onClick={newChat}
                aria-label={t('assistant.newChatAria')}
                className="h-11 rounded-pill px-3 text-caption font-semibold"
              >
                {t('assistant.newChat')}
              </Pressable>
            </GlassSurface>
          ) : null}
          <GlassSurface className="rounded-pill">
            <OverlayClose
              aria-label={t('assistant.close')}
              className="flex size-11 items-center justify-center rounded-pill"
            >
              <Icon name="close" size={16} />
            </OverlayClose>
          </GlassSurface>
        </div>

        <div
          ref={scroller}
          aria-live="polite"
          className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-1"
        >
          {!chat.msgs.length && !chat.thinking ? <Idle now={now} assistant={assistant} /> : null}
          {chat.msgs.map((m) =>
            m.role === 'user' ? (
              <motion.div
                key={m.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={transitionFor('interaction', reduceMotion)}
                className="max-w-[82%] self-end rounded-[22px_22px_6px_22px] bg-inv px-4 py-3 text-body leading-snug text-inv-ink"
              >
                {m.text}
              </motion.div>
            ) : (
              <AiBubble key={m.id} msg={m} assistant={assistant} />
            ),
          )}
          {chat.thinking ? <Thinking /> : null}
        </div>

        <AppToast className="bottom-[calc(9.5rem+env(safe-area-inset-bottom))]" />
        <div className="flex flex-col gap-2.5 bg-[linear-gradient(180deg,transparent,var(--k-bg)_30%)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {chips.map((c) => (
              <GlassSurface key={c} className="flex-none rounded-pill">
                <Pressable
                  onClick={() => assistant.send(c)}
                  className="h-11 whitespace-nowrap rounded-pill px-3.5 text-small font-medium"
                >
                  {c}
                </Pressable>
              </GlassSurface>
            ))}
          </div>
          <GlassSurface level="thick" className="flex items-center gap-2 rounded-pill p-1.5">
            {canSpeak ? (
              <Pressable
                haptic
                onClick={() => void mic()}
                aria-label={chat.listening ? t('assistant.micStop') : t('assistant.micStart')}
                aria-pressed={chat.listening}
                className={`flex size-11.5 flex-none items-center justify-center rounded-pill ${
                  chat.listening ? 'bg-acc text-acc-ink' : 'bg-track text-ink'
                }`}
              >
                <Icon name="mic" size={18} />
              </Pressable>
            ) : null}
            <form
              className="flex min-w-0 flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                assistant.send();
              }}
            >
              {chat.listening ? (
                <div
                  className="flex h-11 min-w-0 flex-1 items-center gap-0.75 px-1.5"
                  role="status"
                >
                  {WAVE.map((w) => (
                    <span
                      key={w.key}
                      aria-hidden="true"
                      className="flex-1 animate-wave rounded-xs bg-acc"
                      style={{ height: w.h, animationDuration: `${w.d}s` }}
                    />
                  ))}
                  <span className="ml-2 whitespace-nowrap font-serif text-input italic text-ink2">
                    {t('assistant.listening')}
                  </span>
                </div>
              ) : (
                <input
                  value={chat.text}
                  onChange={(e) => patchChat({ text: e.target.value })}
                  aria-label={t('assistant.message')}
                  placeholder={t('assistant.placeholder')}
                  enterKeyHint="send"
                  className="h-11 min-w-0 flex-1 bg-transparent text-input text-ink outline-none placeholder:text-ink3"
                />
              )}
              <Pressable
                type="submit"
                aria-label={t('assistant.send')}
                className="flex size-11.5 flex-none items-center justify-center rounded-pill bg-acc text-acc-ink"
              >
                <Icon name="send" size={18} />
              </Pressable>
            </form>
          </GlassSurface>
        </div>
      </div>
    </Overlay>
  );
}

/** Accueil de l'assistant : orbe, salutation, « Ce que je remarque » et « Demande-moi de… ». */
function Idle({ now, assistant }: { now: Date; assistant: Assistant }) {
  const { t } = useTranslation('app');
  const { settings, categories } = useAppData();
  const insights = useInsights(now, assistant);
  const name = settings.profile.name;
  const first = categories[0]?.name;
  const tiles = [
    {
      key: 'plan',
      title: t('assistant.tiles.plan'),
      sub: t('assistant.tiles.planSub'),
      icon: 'plus' as const,
      color: tile('lavande'),
      q: first ? t('assistant.tiles.planQ', { name: first }) : t('assistant.tiles.planQEmpty'),
    },
    {
      key: 'free',
      title: t('assistant.tiles.free'),
      sub: t('assistant.tiles.freeSub'),
      icon: 'today' as const,
      color: tile('lagon'),
      q: t('assistant.reply.freeToday'),
    },
    {
      key: 'review',
      title: t('assistant.tiles.review'),
      sub: t('assistant.tiles.reviewSub'),
      icon: 'check' as const,
      color: tile('menthe'),
      q: t('assistant.tiles.reviewQ'),
    },
    {
      key: 'analyze',
      title: t('assistant.tiles.analyze'),
      sub: t('assistant.tiles.analyzeSub'),
      icon: 'stats' as const,
      color: tile('miel'),
      q: t('assistant.tiles.analyzeQ'),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="relative flex h-42.5 flex-none items-center justify-center">
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
      <h2 className="headline m-0 text-center text-big">
        {t(`assistant.hello.${greetingFor(minuteOfDay(now))}`)}
        {name ? `, ${name}` : ''}.
        <br />
        <em>{t('assistant.watch')}</em>
      </h2>

      {insights.length ? (
        <section className="flex flex-col gap-2.5" aria-label={t('assistant.notice')}>
          <span className="eyebrow">{t('assistant.notice')}</span>
          <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1">
            {insights.map((c) => (
              <GlassSurface
                key={c.key}
                className="relative flex w-55 flex-none snap-start flex-col gap-2 overflow-hidden rounded-slot p-4"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 size-27.5 rounded-pill opacity-45 blur-[40px]"
                  style={{ background: c.color }}
                />
                <span
                  className="relative mono-num text-micro tracking-[0.14em]"
                  style={{ color: c.color }}
                >
                  {c.tag}
                </span>
                <span className="relative text-input font-bold leading-tight tracking-[-0.02em]">
                  {c.title}
                </span>
                <span className="relative flex-1 text-small leading-snug text-ink2">{c.sub}</span>
                <Button size="sm" onClick={c.go} className="relative">
                  {c.cta}
                </Button>
              </GlassSurface>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-2.5" aria-label={t('assistant.askMe')}>
        <span className="eyebrow">{t('assistant.askMe')}</span>
        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((x) => (
            <GlassSurface key={x.key} className="rounded-tile">
              <Pressable
                onClick={() => assistant.send(x.q)}
                className="flex min-h-28 w-full flex-col gap-2.5 rounded-tile p-3.5 text-left"
              >
                <span
                  className="flex size-9 items-center justify-center rounded-icon"
                  style={{ background: x.color, color: inkFor(x.color) }}
                >
                  <Icon name={x.icon} size={18} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-chip font-bold">{x.title}</span>
                  <span className="text-caption leading-snug text-ink3">{x.sub}</span>
                </span>
              </Pressable>
            </GlassSurface>
          ))}
        </div>
      </section>
    </div>
  );
}

function AiBubble({ msg, assistant }: { msg: AiReply; assistant: Assistant }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { reduceMotion } = useAppearance();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={transitionFor('interaction', reduceMotion)}
      className="flex items-start gap-2.5"
    >
      <span aria-hidden="true" className="mt-0.5 size-7 flex-none animate-morph iridescent" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p className="m-0 text-body leading-relaxed">{msg.text}</p>
        {msg.suggestion ? (
          <PlanCard msgId={msg.id} suggestion={msg.suggestion} assistant={assistant} />
        ) : null}
        {msg.slots?.length ? (
          <div className="flex flex-col gap-2">
            {msg.slots.map((sl) => (
              <Pressable
                key={`${sl.startMin}-${sl.endMin}`}
                onClick={() => assistant.book(sl)}
                className="flex h-13 items-center gap-3 rounded-field border-[1.5px] border-dashed border-line px-3.5 text-left"
              >
                <span className="num text-input">
                  {f.clock(sl.startMin)} – {f.clock(sl.endMin)}
                </span>
                <span className="flex-1 mono-num text-label text-ink3">{sl.len}</span>
                <span className="serif text-input text-acc-text">{t('assistant.book')}</span>
              </Pressable>
            ))}
          </div>
        ) : null}
        {msg.actions?.length ? (
          <div className="flex flex-wrap gap-2">
            {msg.actions.map((ac) => (
              <Button
                key={ac.label}
                size="sm"
                variant={ac.ghost ? 'ghost' : 'primary'}
                onClick={() => void assistant.runAction(ac)}
              >
                {ac.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Carte de proposition : à valider (« Ajouter ») ou à ajuster dans la fiche créneau. */
function PlanCard({
  msgId,
  suggestion,
  assistant,
}: {
  msgId: string;
  suggestion: AiSuggestion;
  assistant: Assistant;
}) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { categoryOf } = useAppData();
  const add = suggestion.operations.find((o) => o.op === 'add');
  if (add?.op !== 'add') return null;
  const created = suggestion.operations.find(
    (o) => o.op === 'add_category' && o.category.id === add.block.categoryId,
  );
  const cat = created?.op === 'add_category' ? created.category : categoryOf(add.block.categoryId);
  const b = add.block;
  const applied = suggestion.status === 'applied';
  // Pas de chevauchement : une proposition sur un horaire déjà pris ne peut être qu'ajustée.
  const blocked = suggestion.warnings.some((w) => w.code === 'overlap');
  const when = b.once ? b.once : f.daysText(b.days);
  const dayList = (days: readonly number[]) =>
    days.map((d) => f.dayName(d).slice(0, 3)).join(' · ');
  const warnings = suggestion.warnings.map((w) => {
    switch (w.code) {
      case 'overlap':
        return t('assistant.reply.warnOverlap', { names: w.names.join(' · ') });
      case 'in_sleep':
        return t('assistant.reply.warnSleep');
      case 'overload':
        return t('assistant.reply.warnOverload', { days: dayList(w.days) });
      case 'short_sleep':
        return t('assistant.reply.warnShortSleep', { days: dayList(w.days) });
    }
  });

  return (
    <GlassSurface
      className="flex flex-col gap-3 rounded-tile p-3.5"
      style={{ borderColor: applied ? withAlpha(status.success, 0.5) : undefined }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10.5 flex-none items-center justify-center rounded-chip font-bold"
          style={{ background: cat.color, color: inkFor(cat.color) }}
        >
          {cat.name.charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-input font-bold">{cat.name}</span>
          <span className="mono-num text-label text-ink2">
            {when} · {f.clock(b.startMin)}–{f.clock(b.endMin)} ·{' '}
            <span className="whitespace-nowrap">
              {f.duration(durationMin(b.startMin, b.endMin))}
            </span>
          </span>
        </span>
        <span className="rounded-block bg-track px-1.75 py-1 mono-num text-tiny font-semibold tracking-[0.1em] text-ink2">
          {created ? t('assistant.badgeNew') : t('assistant.badgeSlot')}
        </span>
      </div>
      {warnings.length && !applied ? (
        <p className="m-0 text-caption text-alert">{warnings.join(' · ')}</p>
      ) : null}
      {applied ? (
        <span className="text-small font-semibold" style={{ color: status.success }}>
          {t('assistant.added')}
        </span>
      ) : (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            size="sm"
            disabled={blocked}
            onClick={() => void assistant.apply(msgId, suggestion)}
          >
            {t('assistant.add')}
          </Button>
          <Button
            className="flex-1"
            size="sm"
            variant="ghost"
            onClick={() => assistant.adjust(suggestion)}
          >
            {t('assistant.adjust')}
          </Button>
        </div>
      )}
    </GlassSurface>
  );
}

function Thinking() {
  const { t } = useTranslation('app');
  return (
    <div className="flex items-center gap-2.5" role="status" aria-label={t('assistant.thinking')}>
      <span aria-hidden="true" className="size-7 flex-none animate-morph iridescent" />
      <GlassSurface className="flex gap-1.25 rounded-field px-4 py-3">
        {[0, 0.15, 0.3].map((d) => (
          <span
            key={d}
            aria-hidden="true"
            className="size-1.75 animate-dot rounded-pill bg-ink2"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </GlassSurface>
    </div>
  );
}
