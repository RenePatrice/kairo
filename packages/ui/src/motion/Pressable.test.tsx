import {
  PlatformContext,
  createWebNotifications,
  createWebFiles,
  createWebSpeech,
  type Platform,
} from '@kairo/platform';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceProvider } from '../appearance/AppearanceProvider';
import { Pressable } from './Pressable';
import { reducedFade, spring, transitionFor } from './transitions';

function setup(haptic: boolean) {
  const selection = vi.fn(() => Promise.resolve());
  const platform: Platform = {
    kind: 'web',
    haptics: { selection, impact: vi.fn(), notify: vi.fn() },
    notifications: createWebNotifications(null),
    speech: createWebSpeech(null),
    files: createWebFiles(null),
  };
  const onClick = vi.fn();
  render(
    <PlatformContext.Provider value={platform}>
      <AppearanceProvider>
        <Pressable haptic={haptic} onClick={onClick}>
          Valider
        </Pressable>
      </AppearanceProvider>
    </PlatformContext.Provider>,
  );
  return { selection, onClick };
}

describe('Pressable', () => {
  it('est un vrai bouton, cliquable au clavier', async () => {
    const { onClick } = setup(false);
    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button.getAttribute('type')).toBe('button');
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('déclenche la haptique seulement si demandé', async () => {
    const a = setup(true);
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(a.selection).toHaveBeenCalledOnce();
  });
});

describe('transitions', () => {
  it('utilise les ressorts des tokens, ou un fondu si les animations sont réduites', () => {
    expect(spring('interaction')).toMatchObject({ stiffness: 380, damping: 32 });
    expect(spring('screen')).toMatchObject({ stiffness: 180, damping: 24 });
    expect(transitionFor('screen', true)).toBe(reducedFade);
    expect(transitionFor('screen', false)).toBe(spring('screen'));
  });
});
