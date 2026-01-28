import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ItemList } from './ItemList';

const mockItems = [
    { name: 'Sushi', price: 20 },
    { name: 'Water', price: 5 }
];

describe('ItemList', () => {
    it('renders a list of items and subtotal', () => {
        render(<ItemList items={mockItems} currency="USD" />);
        expect(screen.getByText('Sushi')).toBeDefined();
        expect(screen.getByText('Water')).toBeDefined();
        expect(screen.getByText('$20.00')).toBeDefined();
        expect(screen.getByText('$5.00')).toBeDefined();
        expect(screen.getByText('$25.00')).toBeDefined();
    });

    it('renders nothing if no items provided', () => {
        const { container } = render(<ItemList items={[]} currency="USD" />);
        expect(container.firstChild).toBeNull();
    });
});
