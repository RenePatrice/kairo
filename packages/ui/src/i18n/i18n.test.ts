import { describe, expect, it } from 'vitest';
import { en } from './en';
import { fr } from './fr';
import { createI18n } from './index';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keys(v as object, `${prefix}${k}.`),
  );

describe('i18n', () => {
  it('a exactement les mêmes clés en français et en anglais', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });
  it('traduit et interpole', () => {
    const i18n = createI18n('en');
    expect(i18n.t('now.remaining', { time: '12 min' })).toBe('12 min left');
    void i18n.changeLanguage('fr');
    expect(i18n.t('now.remaining', { time: '12 min' })).toBe('encore 12 min');
  });
  it('accepte des namespaces supplémentaires', () => {
    const i18n = createI18n('fr', {
      fr: { app: { hello: 'Salut' } },
      en: { app: { hello: 'Hi' } },
    });
    expect(i18n.t('app:hello')).toBe('Salut');
  });
});
