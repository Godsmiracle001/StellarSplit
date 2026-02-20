import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DebtTracker } from './DebtTracker';
import type { DebtBalance } from '../../types/analytics';

vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="responsive-container" style={{ width: 500, height: 240 }}>
                {children}
            </div>
        ),
    };
});

const mockData: DebtBalance[] = [
    { userId: 'u1', name: 'Alice', amount: 45.0, direction: 'owe' },
    { userId: 'u2', name: 'Bob', amount: 120.5, direction: 'owed' },
];

describe('DebtTracker', () => {
    it('renders the chart title', () => {
        render(<DebtTracker data={mockData} />);
        expect(screen.getByText('Debt Tracker')).toBeDefined();
    });

    it('renders summary cards', () => {
        render(<DebtTracker data={mockData} />);
        expect(screen.getByText('Owed to You')).toBeDefined();
        expect(screen.getByText('You Owe')).toBeDefined();
        expect(screen.getByText('Net Balance')).toBeDefined();
    });

    it('calculates net balance correctly', () => {
        render(<DebtTracker data={mockData} />);
        // 120.50 - 45.00 = 75.50
        expect(screen.getByText('+$75.50')).toBeDefined();
    });

    it('has the correct id for export', () => {
        const { container } = render(<DebtTracker data={mockData} />);
        expect(container.querySelector('#debt-tracker')).not.toBeNull();
    });
});
