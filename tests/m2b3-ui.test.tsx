// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MiaControlCenter from '../src/components/MiaControlCenter';
import { MISTRAL_PILOT_CEILING_USD } from '../server/ai/budget.mjs';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => {
    throw new Error('network must not be called by M2B-3 UI tests');
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderCenter() {
  return render(<MiaControlCenter />);
}

describe('M2B-3 MIA interface', () => {
  it('renders all three MIA identities from the registry', () => {
    renderCenter();
    const cards = screen.getAllByTestId('mia-model');
    expect(cards).toHaveLength(3);
    const text = cards.map((card) => card.textContent).join(' ');
    expect(text).toContain('MIA Assistant');
    expect(text).toContain('MIA Video Intelligence');
    expect(text).toContain('MIA Advanced Analysis');
  });

  it('marks planned models unusable and never exposes them as executable', () => {
    renderCenter();
    const cards = screen.getAllByTestId('mia-model').map((c) => c.textContent ?? '');
    expect(cards.filter((text) => text.includes('Planned · not usable'))).toHaveLength(2);
    expect(cards.filter((text) => text.includes('cannot run a task'))).toHaveLength(2);
    expect(screen.getByTestId('mia-live-state').textContent).toContain('NON-LIVE');
  });

  it('keeps MIA Assistant visibly adapter-ready but non-live', () => {
    renderCenter();
    const assistant = screen.getAllByTestId('mia-model').find((c) => c.textContent?.includes('MIA Assistant'));
    expect(assistant?.textContent).toContain('Adapter ready · live disabled');
    expect(assistant?.textContent).toContain('No provider request can be sent');
  });

  it('explains unsupported tasks clearly', () => {
    renderCenter();
    fireEvent.change(screen.getByLabelText('Requested task'), { target: { value: 'video_understanding' } });
    fireEvent.click(screen.getByRole('button', { name: 'Explain routing' }));
    expect(screen.getByTestId('mia-explanation').textContent).toContain('MIA cannot perform this task');
  });

  it('never substitutes another model when no model is eligible', () => {
    renderCenter();
    fireEvent.change(screen.getByLabelText('Requested task'), { target: { value: 'audio_dialogue' } });
    fireEvent.click(screen.getByRole('button', { name: 'Explain routing' }));
    expect(screen.getByTestId('mia-no-model').textContent).toContain('No model executed or substituted');
    expect(screen.queryByTestId('mia-decision')).toBeNull();
  });

  it('blocks paid execution because the price is unknown', () => {
    renderCenter();
    expect(screen.getByTestId('mia-consent-required').textContent).toContain('estimated cost is unavailable');
    const approve = screen.getByTestId('mia-approve-button') as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
  });

  it('displays the ceiling from the authoritative budget module', () => {
    renderCenter();
    const budget = screen.getByTestId('mia-budget');
    expect(budget.textContent).toContain(`$${MISTRAL_PILOT_CEILING_USD.toFixed(2)}`);
    expect(budget.textContent).toContain('Remaining allowance');
  });

  it('does not treat unknown cost as confirmed zero cost', () => {
    renderCenter();
    const budget = screen.getByTestId('mia-budget');
    expect(budget.textContent).toContain('Not counted as $0.00');
    expect(within(budget).getByText('Not counted as $0.00')).toBeTruthy();
  });

  it('states that consent is task/model/provider specific', () => {
    renderCenter();
    expect(screen.getByText(/Generic approval is never accepted/)).toBeTruthy();
  });

  it('retains actual provider and model IDs in administrative diagnostics', () => {
    renderCenter();
    fireEvent.click(screen.getByTestId('mia-diagnostics-toggle'));
    const diagnostics = screen.getByTestId('mia-diagnostics').textContent ?? '';
    expect(diagnostics).toContain('openrouter');
    expect(diagnostics).toContain('mistralai/mistral-nemo');
    expect(diagnostics).toContain('disabled');
  });

  it('does not display secrets or environment values', () => {
    renderCenter();
    fireEvent.click(screen.getByTestId('mia-diagnostics-toggle'));
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('sk-or-');
    expect(text).not.toContain('OPENROUTER_API_KEY');
    expect(text).not.toContain('Bearer ');
  });

  it('cannot bypass the execution gate through UI interaction', () => {
    renderCenter();
    const approve = screen.getByTestId('mia-approve-button') as HTMLButtonElement;
    fireEvent.click(approve);
    expect(screen.getByTestId('mia-live-state').textContent).toContain('NON-LIVE');
    expect(screen.getByTestId('mia-footer').textContent).toContain('cannot call');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes no network request during any UI interaction', () => {
    renderCenter();
    fireEvent.change(screen.getByLabelText('Requested task'), { target: { value: 'chat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Explain routing' }));
    fireEvent.click(screen.getByTestId('mia-diagnostics-toggle'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
