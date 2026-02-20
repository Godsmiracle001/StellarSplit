import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SpendingChart } from './SpendingChart';
import type { SpendingTrend } from '../../types/analytics';

// Mock recharts ResponsiveContainer since it needs DOM measurements
vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
                {children}
            </div>
        ),
    };
});

const mockData: SpendingTrend[] = [
    { period: '2026-01-01', totalSpent: 490, transactionCount: 10, avgTransactionAmount: 49 },
    { period: '2026-02-01', totalSpent: 620, transactionCount: 11, avgTransactionAmount: 56.36 },
];

describe('SpendingChart', () => {
    it('renders the chart title', () => {
        render(<SpendingChart data={mockData} />);
        expect(screen.getByText('Spending Trends')).toBeDefined();
    });

    it('renders summary stats', () => {
        render(<SpendingChart data={mockData} />);
        expect(screen.getByText('Total')).toBeDefined();
        expect(screen.getByText('Transactions')).toBeDefined();
        expect(screen.getByText('Avg / Tx')).toBeDefined();
    });

    it('calculates total correctly', () => {
        render(<SpendingChart data={mockData} />);
        // 490 + 620 = 1,110
        expect(screen.getByText('$1,110')).toBeDefined();
    });

    it('has the correct id for export', () => {
        const { container } = render(<SpendingChart data={mockData} />);
        expect(container.querySelector('#spending-chart')).not.toBeNull();
    });
});
