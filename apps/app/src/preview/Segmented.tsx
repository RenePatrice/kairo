import { GlassSurface, Pressable } from '@kairo/ui';

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; swatch?: string }>;
  onChange: (value: T) => void;
}

/** Choix exclusif en capsule de verre (groupe de boutons à bascule, accessible au clavier). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <GlassSurface
        level="thin"
        role="group"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-pill p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              haptic
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`flex min-h-11 items-center gap-2 rounded-pill px-3.5 text-small font-semibold ${
                active ? 'bg-inv text-inv-ink' : 'text-ink2'
              }`}
            >
              {o.swatch ? (
                <span
                  aria-hidden="true"
                  className="size-3 rounded-pill"
                  style={{ background: o.swatch }}
                />
              ) : null}
              {o.label}
            </Pressable>
          );
        })}
      </GlassSurface>
    </div>
  );
}
