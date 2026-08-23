import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DonateButton } from '../components/DonateButton';

function DonateButtonHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Открыть поддержку</button>
      <DonateButton isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

describe('DonateButton accessibility', () => {
  it('exposes a labelled dialog and restores focus after Escape', async () => {
    render(<DonateButtonHarness />);

    const trigger = screen.getByRole('button', { name: 'Открыть поддержку' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Поддержать' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
