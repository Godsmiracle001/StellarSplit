import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SplitHeader } from './SplitHeader';
import type { Split } from '../../types';

const mockSplit: Split = {
    id: '1',
    title: 'Test Split',
    totalAmount: 100,
    currency: 'USD',
    date: new Date().toISOString(),
    status: 'active',
    participants: []
};

describe('SplitHeader', () => {
    it('renders the split title and amount', () => {
        render(<SplitHeader split={mockSplit} />);
        expect(screen.getByText('Test Split')).toBeDefined();
        expect(screen.getByText('$100.00')).toBeDefined();
    });

    it('shows active status badge', () => {
        render(<SplitHeader split={mockSplit} />);
        expect(screen.getByText('Active')).toBeDefined();
    });
});
