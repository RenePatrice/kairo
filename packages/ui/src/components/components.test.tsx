import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test-utils';
import { inkOnColor } from '../tokens';
import { Button } from './Button';
import { CommandBar } from './CommandBar';
import { Dock } from './Dock';
import { InsightCard } from './InsightCard';
import { NowCard } from './NowCard';
import { Pill } from './Pill';
import { Sheet } from './Sheet';
import { HoursBar, Legend, StatTile, TopicCard } from './Stats';
import { TimeBlock } from './TimeBlock';
import { Toast } from './Toast';
import { WeekGrid } from './WeekGrid';

describe('TimeBlock', () => {
  it('annonce le créneau et choisit un texte lisible sur sa couleur', () => {
    renderUi(
      <TimeBlock
        title="Sport"
        timeLabel="18:00–19:00"
        color="#7CB7FF"
        ariaLabel="Sport, de 18 h à 19 h, samedi"
      />,
    );
    const el = screen.getByRole('group', { name: 'Sport, de 18 h à 19 h, samedi' });
    expect(el.style.color).toBe('rgb(11, 13, 24)'); // inkOnColor.dark
    expect(inkOnColor.dark).toBe('#0B0D18');
  });

  it('précise l’état en cours ou proposé par l’IA', () => {
    renderUi(
      <>
        <TimeBlock title="A" timeLabel="" color="#FF7A85" ariaLabel="A" variant="current" />
        <TimeBlock title="B" timeLabel="" color="#FF7A85" ariaLabel="B" variant="ghost" />
      </>,
    );
    expect(screen.getByRole('group', { name: 'A, en cours' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'B, Proposé par l’IA' })).toBeTruthy();
  });

  it('devient un bouton quand il est cliquable', async () => {
    const onClick = vi.fn();
    renderUi(
      <TimeBlock
        title="Lecture"
        timeLabel=""
        color="#B4A5FF"
        ariaLabel="Lecture"
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lecture' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('WeekGrid', () => {
  it('place chaque bloc dans sa colonne de jour, côte à côte en cas de chevauchement', () => {
    renderUi(
      <WeekGrid
        window={{ startMin: 420, endMin: 1380 }}
        marks={[
          { minute: 420, label: '07:00' },
          { minute: 480, label: '08:00' },
        ]}
        nowMin={600}
        days={[
          {
            id: 'mon',
            label: 'LUN',
            sublabel: '16',
            fullLabel: 'lundi 16 novembre',
            isToday: true,
            blocks: [
              {
                id: 'a',
                startMin: 480,
                durationMin: 60,
                lane: 0,
                lanes: 2,
                title: 'A',
                timeLabel: '08:00–09:00',
                color: '#7CB7FF',
                ariaLabel: 'A',
              },
              {
                id: 'b',
                startMin: 500,
                durationMin: 30,
                lane: 1,
                lanes: 2,
                title: 'B',
                timeLabel: '08:20–08:50',
                color: '#FF7A85',
                ariaLabel: 'B',
              },
            ],
          },
          { id: 'tue', label: 'MAR', fullLabel: 'mardi 17 novembre', blocks: [] },
        ]}
      />,
    );
    const monday = screen.getByRole('region', { name: 'lundi 16 novembre' });
    const a = within(monday).getByRole('group', { name: 'A' }).closest('li');
    const b = within(monday).getByRole('group', { name: 'B' }).closest('li');
    expect(a?.style.top).toBe('48px');
    expect(a?.style.width).toBe('calc(50% - 4px)');
    expect(b?.style.left).toBe('calc(50% + 2px)');
    expect(b?.querySelector('[data-variant]')?.className).toContain('items-center'); // compact
    expect(screen.getByRole('region', { name: 'mardi 17 novembre' })).toBeTruthy();
    expect(screen.getByText('07:00')).toBeTruthy();
  });
});

describe('NowCard', () => {
  it('montre le bloc en cours et le suivant', () => {
    renderUi(
      <NowCard
        current={{
          title: 'Révisions',
          color: '#B4A5FF',
          timeLabel: '18:00–19:30',
          remainingLabel: '24 min',
          progress: 0.7,
        }}
        next={{ title: 'Dîner', color: '#FFC861', timeLabel: '19:30' }}
      />,
    );
    expect(screen.getByText('Révisions')).toBeTruthy();
    expect(screen.getByText('encore 24 min')).toBeTruthy();
    expect(screen.getByText('Dîner')).toBeTruthy();
  });
  it('explique quand rien n’est prévu', () => {
    renderUi(<NowCard current={null} next={null} />, { locale: 'en' });
    expect(screen.getByText('Nothing planned today.')).toBeTruthy();
    expect(screen.getByText('No upcoming slot')).toBeTruthy();
  });
});

function ControlledCommandBar(props: {
  onSubmit: (v: string) => void;
  onToggleVoice?: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <CommandBar
      value={value}
      onChange={setValue}
      onSubmit={props.onSubmit}
      suggestions={['Analyse ma semaine']}
      {...(props.onToggleVoice ? { onToggleVoice: props.onToggleVoice } : {})}
    />
  );
}

describe('CommandBar', () => {
  it('envoie la demande saisie, jamais une demande vide', async () => {
    const onSubmit = vi.fn();
    renderUi(<ControlledCommandBar onSubmit={onSubmit} />);
    const send = screen.getByRole('button', { name: 'Envoyer' });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message à l’assistant' }),
      'Déplace mon sport à 18 h{Enter}',
    );
    expect(onSubmit).toHaveBeenCalledWith('Déplace mon sport à 18 h');
  });
  it('propose des suggestions cliquables', async () => {
    const onSubmit = vi.fn();
    renderUi(<ControlledCommandBar onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Analyse ma semaine' }));
    expect(onSubmit).toHaveBeenCalledWith('Analyse ma semaine');
  });
  it('donne le focus avec Ctrl + K et expose le micro', () => {
    const onToggleVoice = vi.fn();
    renderUi(<ControlledCommandBar onSubmit={vi.fn()} onToggleVoice={onToggleVoice} />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Dicter' }));
    expect(onToggleVoice).toHaveBeenCalledOnce();
  });
});

describe('InsightCard', () => {
  it('laisse toujours le choix Appliquer / Ignorer', async () => {
    const onApply = vi.fn();
    const onDismiss = vi.fn();
    renderUi(
      <InsightCard
        body="Tu as fait 11 h de labo, 2 h de plus que prévu."
        onApply={onApply}
        onDismiss={onDismiss}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Appliquer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ignorer' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('Toast', () => {
  it('se ferme seul après 5 secondes', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderUi(<Toast message="Créneau supprimé" onClose={onClose} />);
    expect(screen.getByText('Créneau supprimé')).toBeTruthy();
    act(() => vi.advanceTimersByTime(4999));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it('permet d’annuler', async () => {
    const onUndo = vi.fn();
    const onClose = vi.fn();
    renderUi(<Toast message="Créneau supprimé" onUndo={onUndo} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Sheet', () => {
  it('ouvre une boîte de dialogue accessible et se ferme', async () => {
    const onOpenChange = vi.fn();
    renderUi(
      <Sheet open onOpenChange={onOpenChange} title="Créneau" description="Sport · samedi">
        <p>Contenu</p>
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Créneau' });
    expect(within(dialog).getByText('Contenu')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Dock', () => {
  it('signale l’onglet courant et ouvre l’assistant', async () => {
    const onSelect = vi.fn();
    const onAssistant = vi.fn();
    renderUi(
      <Dock
        tabs={[
          { id: 'today', label: 'Aujourd’hui', icon: 'today' },
          { id: 'week', label: 'Semaine', icon: 'week' },
          { id: 'stats', label: 'Stats', icon: 'stats' },
          { id: 'me', label: 'Moi', icon: 'me' },
        ]}
        current="week"
        onSelect={onSelect}
        onAssistant={onAssistant}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(nav).getByRole('button', { name: 'Semaine' }).getAttribute('aria-current')).toBe(
      'page',
    );
    await userEvent.click(within(nav).getByRole('button', { name: 'Stats' }));
    await userEvent.click(within(nav).getByRole('button', { name: 'Parler à l’assistant' }));
    expect(onSelect).toHaveBeenCalledWith('stats');
    expect(onAssistant).toHaveBeenCalledOnce();
  });
});

describe('Stats, Legend, Pill, Button', () => {
  it('rend les tuiles, barres, légende et puces', () => {
    renderUi(
      <>
        <StatTile label="Réalisé" value="11,5" unit="h" hint="+2 h vs prévu" />
        <HoursBar
          items={[
            {
              id: 'labo',
              label: 'Labo',
              color: '#FFC861',
              doneMin: 270,
              plannedMin: 360,
              valueLabel: '4,5 h / 6 h',
            },
          ]}
        />
        <Legend items={[{ id: 'sport', label: 'Sport', color: '#7CB7FF' }]} />
        <TopicCard eyebrow="Mardi" title="Sécurité web" />
        <Pill tone="streak">7 J DE SÉRIE</Pill>
        <Button variant="accent">Valider</Button>
      </>,
    );
    expect(screen.getByText('11,5')).toBeTruthy();
    const meter = screen.getByRole('meter', { name: 'Labo' });
    expect(meter.getAttribute('aria-valuenow')).toBe('75');
    expect(screen.getByRole('list', { name: 'Légende' })).toBeTruthy();
    expect(screen.getByText('Sécurité web')).toBeTruthy();
    expect(screen.getByText('7 J DE SÉRIE')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeTruthy();
  });
});
