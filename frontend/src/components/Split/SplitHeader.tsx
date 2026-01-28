import { Calendar } from 'lucide-react';
import type { Split } from '../../types';

interface SplitHeaderProps {
    split: Split;
}

export const SplitHeader = ({ split }: SplitHeaderProps) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4">
            <div className="flex justify-between items-start mb-2">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{split.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${split.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {split.status === 'active' ? 'Active' : 'Settled'}
                </span>
            </div>

            <div className="flex items-center gap-4 text-gray-500 text-sm mb-6">
                <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{new Date(split.date).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-gray-50 py-6 rounded-xl border border-dashed border-gray-200">
                <span className="text-gray-500 text-sm font-medium mb-1 uppercase tracking-wide">Total Bill</span>
                <span className="text-4xl font-black text-gray-900 tracking-tight">
                    {split.currency === 'USD' ? '$' : split.currency}{split.totalAmount.toFixed(2)}
                </span>
            </div>
        </div>
    );
};
