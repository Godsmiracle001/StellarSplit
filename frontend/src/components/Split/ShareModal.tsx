import { X, Copy, QrCode, Share2 } from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    splitLink: string;
}

export const ShareModal = ({ isOpen, onClose, splitLink }: ShareModalProps) => {
    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(splitLink);
            // Ideally trigger a toast here
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join my Stellar Split',
                    text: 'Help settle this expense on Stellar Split!',
                    url: splitLink,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-300">

                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Share Split</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-white rounded-2xl p-8 mb-6 flex items-center justify-center border-2 border-gray-100 shadow-sm">
                    <div className="text-center">
                        <div className="w-48 h-48 bg-gray-900 rounded-xl flex items-center justify-center mb-4 mx-auto text-white shadow-lg overflow-hidden relative">
                            {/* Placeholder for QR Code - ideally use qrcode.react here */}
                            <QrCode size={120} strokeWidth={1.5} />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-xs text-white px-2 text-center">{splitLink}</span>
                            </div>
                        </div>
                        <span className="text-sm font-medium text-gray-500">Scan to join split</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleCopy} className="flex-1 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-100">
                        <Copy size={18} /> Copy Link
                    </button>
                    <button onClick={handleShare} className="flex-1 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-purple-200 transition-colors flex items-center justify-center gap-2">
                        <Share2 size={18} /> Share
                    </button>
                </div>
            </div>
        </div>
    );
};
