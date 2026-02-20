import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PaymentHeatmap } from './PaymentHeatmap';
import type { HeatmapCell } from '../../types/analytics';

const mockData: HeatmapCell[] = [
    { date: '2026-02-01', count: 3, total: 120 },
    { date: '2026-02-02', count: 0, total: 0 },
    { date: '2026-02-03', count: 5, total: 250 },
];

describe('PaymentHeatmap', () => {
    it('renders the chart title', () => {
        render(<PaymentHeatmap data={mockData} />);
        expect(screen.getByText('Payment Activity')).toBeDefined();
    });

    it('renders the legend', () => {
        render(<PaymentHeatmap data={mockData} />);
        expect(screen.getByText('Less')).toBeDefined();
        expect(screen.getByText('More')).toBeDefined();
    });

    it('has the correct id for export', () => {
        const { container } = render(<PaymentHeatmap data={mockData} />);
        expect(container.querySelector('#payment-heatmap')).not.toBeNull();
    });
});
