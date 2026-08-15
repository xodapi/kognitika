import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PrivacyNotice } from './PrivacyNotice';

describe('PrivacyNotice', () => {
  it('describes technical storage and avoids an analytics-consent claim', () => {
    render(
      <MemoryRouter>
        <PrivacyNotice />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Приватность и cookies' })).toBeInTheDocument();
    expect(screen.getByText(/localStorage/i)).toBeInTheDocument();
    expect(screen.getByText(/не использует рекламные cookies/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'sbb@bsosh3.org' })).toHaveAttribute(
      'href',
      'mailto:sbb@bsosh3.org',
    );
    expect(screen.getByRole('link', { name: /технический реестр обработки данных/i })).toHaveAttribute(
      'href',
      'https://github.com/xodapi/kognitika/blob/master/docs/privacy-data-processing-inventory.md',
    );
    expect(screen.getByRole('link', { name: /технический реестр обработки данных/i })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
});
