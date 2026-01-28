import { FileText } from 'lucide-react';

interface ReceiptImageProps {
    imageUrl?: string;
    onView?: () => void;
}

export const ReceiptImage = ({ imageUrl, onView }: ReceiptImageProps) => {
    if (!imageUrl) return null;

    return (
        <div className="mt-4 mb-6">
            <div
                onClick={onView}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onView?.();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-label="View full receipt"
                className="relative h-48 w-full bg-gray-100 rounded-xl overflow-hidden cursor-pointer group border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
                <img
                    src={imageUrl}
                    alt="Receipt"
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium flex items-center gap-2 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <FileText size={20} /> View Receipt
                    </span>
                </div>
            </div>
        </div>
    );
};
