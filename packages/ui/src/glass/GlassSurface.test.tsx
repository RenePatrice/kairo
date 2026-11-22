import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider';
import { GlassSurface } from './GlassSurface';

describe('GlassSurface', () => {
  it('rend du verre avec le niveau demandé', () => {
    render(
      <AppearanceProvider glass="lite">
        <GlassSurface level="thick" data-testid="s">
          Contenu
        </GlassSurface>
      </AppearanceProvider>,
    );
    const el = screen.getByTestId('s');
    expect(el.dataset['glass']).toBe('thick');
    expect(el.style.background).toBe('var(--k-glass-thick)');
    expect(el.textContent).toBe('Contenu');
  });

  it('se replie en surface pleine quand la transparence est réduite', () => {
    render(
      <AppearanceProvider transparency="reduced" glass="full">
        <GlassSurface data-testid="s">Texte</GlassSurface>
      </AppearanceProvider>,
    );
    const el = screen.getByTestId('s');
    expect(el.dataset['glass']).toBe('solid');
    expect(el.style.background).toBe('var(--k-solid)');
    expect(el.style.backdropFilter).toBe('');
  });

  it('ajoute la réfraction SVG en verre complet, sauf au niveau fin', () => {
    const { container } = render(
      <AppearanceProvider glass="full">
        <GlassSurface level="regular" data-testid="r" />
        <GlassSurface level="thin" data-testid="t" />
      </AppearanceProvider>,
    );
    const filterId = container.querySelector('filter')?.id ?? '';
    expect(filterId).toMatch(/^k-refraction-/);
    expect(screen.getByTestId('r').style.backdropFilter).toContain(`url(#${filterId})`);
    expect(screen.getByTestId('t').style.backdropFilter).not.toContain('url(');
  });

  it('ne duplique pas le filtre dans des fournisseurs imbriqués', () => {
    const { container } = render(
      <AppearanceProvider glass="full">
        <AppearanceProvider theme="papier" glass="full">
          <GlassSurface />
        </AppearanceProvider>
      </AppearanceProvider>,
    );
    expect(container.querySelectorAll('filter')).toHaveLength(1);
  });

  it('fait suivre le reflet au pointeur en verre complet seulement', () => {
    render(
      <AppearanceProvider glass="full">
        <GlassSurface interactive data-testid="s" />
      </AppearanceProvider>,
    );
    const el = screen.getByTestId('s');
    fireEvent.pointerMove(el, { clientX: 0, clientY: 0 });
    expect(el.style.getPropertyValue('--k-spec-x')).not.toBe('');
    fireEvent.pointerLeave(el);
    expect(el.style.getPropertyValue('--k-spec-x')).toBe('');
  });

  it('change de balise pour la sémantique', () => {
    render(
      <AppearanceProvider>
        <GlassSurface as="nav" aria-label="Navigation principale" />
      </AppearanceProvider>,
    );
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeTruthy();
  });
});
