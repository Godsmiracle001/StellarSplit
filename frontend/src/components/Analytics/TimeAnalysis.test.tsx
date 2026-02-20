import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimeAnalysis } from './TimeAnalysis';
import type { TimeDistribution } from '../../types/analytics';

vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="responsive-container" style={{ width: 500, height: 280 }}>
                {children}
            </div>
        ),
    };
});

const mockData: TimeDistribution[] = [
    { label: 'Mon', count: 12, amount: 340 },
    { label: 'Tue', count: 8, amount: 210 },
    { label: 'Wed', count: 15, amount: 480 },
];

describe('TimeAnalysis', () => {
    it('renders the chart title', () => {
        render(<TimeAnalysis data={mockData} />);
        expect(screen.getByText('Time Analysis')).toBeDefined();
    });

    it('renders view toggle buttons', () => {
        render(<TimeAnalysis data={mockData} />);
        expect(screen.getByText('Day of Week')).toBeDefined();
        expect(screen.getByText('By Amount')).toBeDefined();
    });

    it('shows peak day info', () => {
        render(<TimeAnalysis data={mockData} />);
        // Wed has the highest count (15)
        expect(screen.getByText('Wed')).toBeDefined();
    });

    it('toggles between views', () => {
        render(<TimeAnalysis data={mockData} />);
        const amountBtn = screen.getByText('By Amount');
        fireEvent.click(amountBtn);
        // After clicking, the button should have active styling (white bg)
        expect(amountBtn.className).toContain('bg-white');
    });

    it('has the correct id for export', () => {
        const { container } = render(<TimeAnalysis data={mockData} />);
        expect(container.querySelector('#time-analysis')).not.toBeNull();
    });
});
