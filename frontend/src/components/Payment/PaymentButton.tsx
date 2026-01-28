import { Wallet } from 'lucide-react';

interface PaymentButtonProps {
    amount: number;
    currency: string;
    onClick: () => void;
    disabled?: boolean;
}

export const PaymentButton = ({ amount, currency, onClick, disabled }: PaymentButtonProps) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 shadow-2xl md:static md:bg-transparent md:border-0 md:shadow-none md:p-0 z-10">
            <div className="max-w-md mx-auto md:max-w-none">
                <button
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                        <Wallet size={20} className="text-white" />
                    </div>
                    <span className="text-lg">Pay {currency === 'USD' ? '$' : currency}{amount.toFixed(2)}</span>
                </button>
                <p className="text-center text-xs text-gray-400 mt-2 md:hidden">
                    Secured by Stellar Network
                </p>
            </div>
        </div>
    );
};
