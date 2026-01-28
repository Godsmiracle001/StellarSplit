import { X, ShieldCheck } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    currency: string;
    onConfirm: () => void;
    isProcessing?: boolean;
}

export const PaymentModal = ({ isOpen, onClose, amount, currency, onConfirm, isProcessing }: PaymentModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={24} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600 shadow-sm">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
                    <p className="text-gray-500 text-sm mt-1">You are sending</p>
                    <div className="text-4xl font-black text-gray-900 mt-2 tracking-tight">
                        {currency === 'USD' ? '$' : currency}{amount.toFixed(2)}
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="p-3 border-2 border-purple-100 rounded-xl flex items-center gap-3 cursor-pointer bg-purple-50/50">
                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-xs">F</span>
                        </div>
                        <div className="flex-1">
                            <span className="font-bold text-gray-900 text-sm block">Freighter Wallet</span>
                            <span className="text-xs text-purple-600 font-medium">Connected • GBAN...45X</span>
                        </div>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onConfirm}
                    disabled={isProcessing}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center disabled:opacity-75 disabled:cursor-wait"
                >
                    {isProcessing ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Processing...
                        </>
                    ) : (
                        'Confirm Payment'
                    )}
                </button>
            </div>
        </div>
    );
};
