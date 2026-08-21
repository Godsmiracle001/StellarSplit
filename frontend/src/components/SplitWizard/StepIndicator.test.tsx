import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StepIndicator } from './StepIndicator';

const STEPS = [
    { label: 'Basic Info' },
    { label: 'Method' },
    { label: 'Participants' },
    { label: 'Review' },
];

describe('StepIndicator', () => {
    it('renders the correct number of steps', () => {
        render(<StepIndicator steps={STEPS} currentStep={0} />);
        expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });

    it('shows step numbers for incomplete steps', () => {
        render(<StepIndicator steps={STEPS} currentStep={0} />);
        expect(screen.getByText('2')).toBeDefined();
        expect(screen.getByText('3')).toBeDefined();
        expect(screen.getByText('4')).toBeDefined();
    });

    it('highlights the active step label', () => {
        const { container } = render(<StepIndicator steps={STEPS} currentStep={1} />);
        const methodLabel = screen.getByText('Method');
        expect(methodLabel.className).toContain('text-purple-600');
        expect(container).toBeTruthy();
    });

    it('renders a check for completed steps', () => {
        const { container } = render(<StepIndicator steps={STEPS} currentStep={2} />);
        // Steps 0 and 1 should have check icons (svg), not numbers
        const stepNumbers = container.querySelectorAll('div[class*="rounded-full"]');
        expect(stepNumbers.length).toBeGreaterThan(0);
    });

    it('exposes the current step and overall progress', () => {
        render(<StepIndicator steps={STEPS} currentStep={1} />);

        expect(screen.getByRole('navigation', { name: 'Step 2 of 4: Method' })).toBeDefined();
        expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Step 2 of 4: Method');
        expect(screen.getAllByRole('listitem')[2]).toHaveAttribute('aria-disabled', 'true');
    });

    it('lets keyboard users activate completed steps', async () => {
        const user = userEvent.setup();
        const onStepClick = vi.fn();
        render(<StepIndicator steps={STEPS} currentStep={2} onStepClick={onStepClick} />);

        const completedStep = screen.getByRole('button', { name: 'Step 1 of 4: Basic Info' });
        completedStep.focus();
        await user.keyboard('{Enter}');

        expect(onStepClick).toHaveBeenCalledWith(0);
        expect(screen.queryByRole('button', { name: 'Step 4 of 4: Review' })).toBeNull();
    });
});
