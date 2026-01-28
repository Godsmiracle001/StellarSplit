import type { Item } from '../../types';

interface ItemListProps {
    items: Item[];
    currency: string;
}

export const ItemList = ({ items, currency }: ItemListProps) => {
    if (!items || items.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                <h3 className="font-semibold text-gray-700">Receipt Items</h3>
            </div>
            <div className="divide-y divide-gray-50">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white">
                        <span className="text-gray-700 font-medium">{item.name}</span>
                        <span className="font-bold text-gray-900">
                            {currency === 'USD' ? '$' : currency}{item.price.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-gray-50/30 flex justify-between items-center text-sm">
                <span className="text-gray-500 italic">Subtotal before tax & tip</span>
                <span className="font-semibold text-gray-600">
                    {currency === 'USD' ? '$' : currency}
                    {items.reduce((acc, item) => acc + item.price, 0).toFixed(2)}
                </span>
            </div>
        </div>
    );
};
