import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryPieChart } from './CategoryPieChart';
import type { CategoryBreakdown } from '../../types/analytics';

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

const mockData: CategoryBreakdown[] = [
    { category: 'Food & Dining', amount: 890 },
    { category: 'Entertainment', amount: 420 },
    { category: 'Transport', amount: 310 },
];

describe('CategoryPieChart', () => {
    it('renders the chart title', () => {
        render(<CategoryPieChart data={mockData} />);
        expect(screen.getByText('Category Breakdown')).toBeDefined();
    });

    it('has the correct id for export', () => {
        const { container } = render(<CategoryPieChart data={mockData} />);
        expect(container.querySelector('#category-pie-chart')).not.toBeNull();
    });
});
