import { TROPHY_IDS } from '@kairo/core';
import { GlassSurface, inkFor, trophyColors, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { TrophyIcon } from '../../components/TrophyIcon';
import type { BilansData } from '../StatsScreen';

/** Vue « Trophées » : la collection, débloqués d'abord. */
export function TrophyTab({ data }: { data: BilansData }) {
  const { t } = useTranslation('app');
  const list = TROPHY_IDS.map((id) => ({ id, on: data.trophies[id] })).sort(
    (a, b) => Number(b.on) - Number(a.on),
  );
  const count = list.filter((x) => x.on).length;

  return (
    <div className="flex flex-col gap-3.5">
      <GlassSurface className="flex flex-col gap-2.5 rounded-wide p-4.5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{t('stats.collection')}</span>
          <span className="num text-title">
            {count} / {TROPHY_IDS.length}
          </span>
        </div>
        <span
          className="h-2 overflow-hidden rounded-xs bg-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TROPHY_IDS.length}
          aria-valuenow={count}
          aria-label={t('stats.collection')}
        >
          <span
            className="block h-full rounded-xs iridescent"
            style={{ width: `${Math.round((count / TROPHY_IDS.length) * 100)}%` }}
          />
        </span>
        <span className="text-small text-ink2">{t('stats.collectionBody')}</span>
      </GlassSurface>
      <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
        {list.map(({ id, on }) => {
          const [name, desc] = t(`stats.trophies.${id}`, { returnObjects: true }) as string[];
          const color = trophyColors[id];
          return (
            <li key={id} className={on ? '' : 'opacity-55'}>
              <GlassSurface className="flex h-full flex-col items-center gap-2 rounded-tile px-2 py-3.5 text-center">
                <span
                  className="flex size-13 items-center justify-center rounded-field"
                  style={{
                    background: on ? color : 'var(--k-track)',
                    color: on ? inkFor(color) : 'var(--k-ink3)',
                    boxShadow: on ? `0 0 22px ${withAlpha(color, 0.5)}` : 'none',
                  }}
                >
                  <TrophyIcon id={id} />
                </span>
                <span className="text-caption font-bold leading-tight">{name}</span>
                <span className="text-micro leading-snug text-ink3">{desc}</span>
              </GlassSurface>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
