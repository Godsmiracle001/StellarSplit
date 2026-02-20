import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChartExportButton } from './ChartExportButton';

vi.mock('html-to-image', () => ({
    toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

describe('ChartExportButton', () => {
    it('renders the Export button', () => {
        render(<ChartExportButton targetId="test-chart" />);
        expect(screen.getByText('Export')).toBeDefined();
    });

    it('has the correct title attribute', () => {
        render(<ChartExportButton targetId="test-chart" />);
        expect(screen.getByTitle('Export as PNG')).toBeDefined();
    });
});
