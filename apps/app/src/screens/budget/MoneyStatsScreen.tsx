import { dateKey, monthHistory, monthKeyOf, topCategories, type MonthPoint } from '@kairo/core';
import { GlassSurface, chartSeries, themes, useAppearance } from '@kairo/ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBudget } from '../../lib/budget';
import { useFormat } from '../../lib/format';
import { useUi } from '../../store';

const H = 160;
const TOP = 18;
const BOTTOM = 22;
const LEFT = 4;
const GAP = 2;

/** Barre à bout arrondi (4 px) côté valeur, posée sur la ligne de base. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Arrondit le maximum de l'axe à une valeur ronde (1, 2, 5 × 10ⁿ). */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const pct = (r: number) => Math.round(r * 100);

/** Bilans du Budget : revenus et dépenses sur 6 mois, taux d'épargne, top des dépenses. */
export function MoneyStatsScreen() {
  const { t } = useTranslation('app');
  const f = useFormat();
  const b = useBudget();
  const go = useUi((s) => s.go);
  const { theme } = useAppearance();
  const series = themes[theme].light ? chartSeries.light : chartSeries.dark;
  const [active, setActive] = useState<number | null>(null);
  // Le graphique se dessine à la largeur réelle : le texte garde sa taille sur grand écran.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(320);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setW(Math.max(240, Math.round(e.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [b.ready]);
  if (!b.ready) return null;

  const month = monthKeyOf(dateKey(new Date()));
  const history = monthHistory(b.transactions, month);
  const top = topCategories(b.categories, b.transactions, month);
  const current = history[history.length - 1];
  const rates = history.map((h) => h.savingsRate).filter((r): r is number => r !== null);
  const avg = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : null;
  const hasData = history.some((h) => h.incomeCents || h.expenseCents);

  const monthLabel = (m: MonthPoint['month'], style: 'short' | 'long') =>
    new Date(`${m}-15T12:00:00`).toLocaleDateString(f.locale, {
      month: style,
      ...(style === 'long' ? { year: 'numeric' } : {}),
    });
  const tip = (h: MonthPoint) =>
    t('budget.stats.tooltip', {
      month: monthLabel(h.month, 'long'),
      income: b.money(h.incomeCents),
      expense: b.money(h.expenseCents),
    });

  const max = niceMax(Math.max(...history.map((h) => Math.max(h.incomeCents, h.expenseCents))));
  const plotH = H - TOP - BOTTOM;
  const slot = (W - LEFT) / history.length;
  const BAR = Math.min(18, Math.max(8, slot / 4));
  const yOf = (c: number) => TOP + plotH - (c / max) * plotH;
  const shown = history[active ?? history.length - 1];
  const topMax = top[0]?.cents ?? 1;
  const compact = b.currency
    ? new Intl.NumberFormat(f.locale === 'en' ? 'en' : 'fr', {
        style: 'currency',
        currency: b.currency,
        notation: 'compact',
      })
    : null;
  const axisLabel = (cents: number) => compact?.format(cents / 100) ?? String(cents / 100);

  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <button
        type="button"
        onClick={() => go('money')}
        className="min-h-11 self-start text-caption font-semibold text-acc-text"
      >
        ← {t('budget.stats.back')}
      </button>
      <h1 className="headline text-hero">
        {t('budget.stats.titleA')} <em>{t('budget.stats.titleB')}</em>.
      </h1>

      {!hasData ? (
        <GlassSurface className="rounded-card p-4 text-body leading-normal text-ink2">
          {t('budget.stats.empty')}
        </GlassSurface>
      ) : null}

      <GlassSurface className="flex flex-col gap-1 rounded-card p-4">
        <span className="eyebrow">{t('budget.stats.savingsRate')}</span>
        <span className="num text-hero">
          {current?.savingsRate != null ? `${pct(current.savingsRate)} %` : '—'}
        </span>
        <span className="text-caption text-ink2">
          {current?.savingsRate != null
            ? t('budget.stats.savingsRateMonth')
            : t('budget.stats.noRate')}
          {avg !== null ? ` · ${t('budget.stats.savingsAvg', { pct: pct(avg) })}` : ''}
        </span>
      </GlassSurface>

      <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
        <section className="flex flex-col gap-3" aria-label={t('budget.stats.history')}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="eyebrow">{t('budget.stats.history')}</span>
            <span className="text-caption text-ink3">{t('budget.stats.historyHint')}</span>
          </div>
          <ul className="m-0 flex list-none gap-4 p-0 text-caption text-ink2" aria-hidden="true">
            {(['income', 'expense'] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs" style={{ background: series[k] }} />
                {t(`budget.stats.${k}`)}
              </li>
            ))}
          </ul>
          {shown ? (
            <p className="m-0 mono-num text-caption text-ink2" aria-live="polite">
              <span className="font-semibold text-ink">{monthLabel(shown.month, 'long')}</span>
              {' · '}
              {t('budget.stats.income')} {b.money(shown.incomeCents)}
              {' · '}
              {t('budget.stats.expense')} {b.money(shown.expenseCents)}
            </p>
          ) : null}
          <div ref={box}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width={W}
              height={H}
              className="block max-w-full"
              aria-hidden="true"
              onPointerLeave={() => setActive(null)}
            >
              {[0.5, 1].map((r) => (
                <line
                  key={r}
                  x1={LEFT}
                  x2={W}
                  y1={yOf(max * r)}
                  y2={yOf(max * r)}
                  stroke="var(--k-line)"
                  strokeDasharray="2 4"
                />
              ))}
              <line x1={LEFT} x2={W} y1={yOf(0)} y2={yOf(0)} stroke="var(--k-line)" />
              <text x={LEFT} y={yOf(max) - 5} fontSize="10" fill="var(--k-ink3)">
                {axisLabel(max)}
              </text>
              {history.map((h, i) => {
                const cx = LEFT + slot * i + slot / 2;
                const xi = cx - BAR - GAP / 2;
                const xe = cx + GAP / 2;
                const isActive = (active ?? history.length - 1) === i;
                return (
                  <g
                    key={h.month}
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                    opacity={active === null || isActive ? 1 : 0.45}
                  >
                    <title>{tip(h)}</title>
                    <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" />
                    <path
                      d={barPath(xi, yOf(h.incomeCents), BAR, yOf(0) - yOf(h.incomeCents))}
                      fill={series.income}
                    />
                    <path
                      d={barPath(xe, yOf(h.expenseCents), BAR, yOf(0) - yOf(h.expenseCents))}
                      fill={series.expense}
                    />
                    <text
                      x={cx}
                      y={H - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isActive ? 'var(--k-ink)' : 'var(--k-ink3)'}
                      fontWeight={isActive ? 600 : 400}
                    >
                      {monthLabel(h.month, 'short')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="sr-only">
            <table>
              <caption>{t('budget.stats.table')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('budget.stats.month')}</th>
                  <th scope="col">{t('budget.stats.income')}</th>
                  <th scope="col">{t('budget.stats.expense')}</th>
                  <th scope="col">{t('budget.stats.savingsRate')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.month}>
                    <th scope="row">{monthLabel(h.month, 'long')}</th>
                    <td>{b.money(h.incomeCents)}</td>
                    <td>{b.money(h.expenseCents)}</td>
                    <td>{h.savingsRate !== null ? `${pct(h.savingsRate)} %` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </GlassSurface>

      <section className="flex flex-col gap-2" aria-label={t('budget.stats.top')}>
        <span className="eyebrow">{t('budget.stats.top')}</span>
        {top.length ? (
          <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
            {top.slice(0, 6).map((c) => {
              const cat = b.categoryOf(c.categoryId);
              const color = cat?.color ?? series.expense;
              return (
                <div key={c.categoryId} className="flex flex-col gap-1.5">
                  <span className="flex items-baseline gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 self-center rounded-pill"
                      style={{ background: color }}
                    />
                    <span className="flex-1 truncate text-body font-semibold">{cat?.name}</span>
                    <span className="mono-num text-small">{b.money(c.cents)}</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-xs bg-track">
                    <span
                      className="block h-full rounded-xs"
                      style={{ width: `${(c.cents / topMax) * 100}%`, background: color }}
                    />
                  </span>
                  <span className="mono-num text-caption text-ink3">
                    {c.change === null
                      ? t('budget.stats.newThisMonth')
                      : `${c.change > 0 ? '↑ +' : c.change < 0 ? '↓ −' : ''}${Math.abs(pct(c.change))} % ${t('budget.stats.vsLast')}`}
                  </span>
                </div>
              );
            })}
          </GlassSurface>
        ) : (
          <GlassSurface className="rounded-card p-4 text-body leading-normal text-ink2">
            {t('budget.stats.topEmpty')}
          </GlassSurface>
        )}
      </section>
    </div>
  );
}
