import { activityPalette, Pressable } from '@kairo/ui';
import { useTranslation } from 'react-i18next';

/** Les 12 couleurs pastel des activités, en grille de 6 (maquette). */
export function Swatches({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { t } = useTranslation('app');
  return (
    <div className="grid grid-cols-6 justify-items-center gap-2.5">
      {activityPalette.map((c) => {
        const on = value === c.hex;
        return (
          <Pressable
            key={c.key}
            haptic
            aria-label={t(`colors.${c.key}`)}
            aria-pressed={on}
            onClick={() => onChange(c.hex)}
            className="size-11 rounded-pill p-1.25"
          >
            <span
              className="block size-full rounded-pill"
              style={{
                background: c.hex,
                boxShadow: on
                  ? `0 0 0 3px var(--k-bg2), 0 0 0 5px ${c.hex}, 0 0 18px ${c.hex}`
                  : 'none',
              }}
            />
          </Pressable>
        );
      })}
    </div>
  );
}
