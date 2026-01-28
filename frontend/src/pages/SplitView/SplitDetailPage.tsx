import { useState, useEffect } from 'react';
import { Share2, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { SplitHeader } from '../../components/Split/SplitHeader';
import { ParticipantList } from '../../components/Split/ParticipantList';
import { ItemList } from '../../components/Split/ItemList';
import { ReceiptImage } from '../../components/Receipt/ReceiptImage';
import { PaymentButton } from '../../components/Payment/PaymentButton';
import { PaymentModal } from '../../components/Payment/PaymentModal';
import { ShareModal } from '../../components/Split/ShareModal';
import { signAndSubmitPayment } from '../../utils/stellar/wallet';
import { LoadingSkeleton } from '../../components/Split/LoadingSkeleton';
import type { Split, Participant } from '../../types';

// Mock Data
const MOCK_SPLIT: Split = {
    id: 'split_123',
    title: 'Dinner at Nobu',
    totalAmount: 450.00,
    currency: 'USD',
    date: new Date().toISOString(),
    status: 'active',
    receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
    participants: [
        { id: '1', name: 'You', amountOwed: 112.50, status: 'pending', isCurrentUser: true },
        { id: '2', name: 'Sarah M.', amountOwed: 112.50, status: 'paid', avatar: 'https://i.pravatar.cc/150?u=1' },
        { id: '3', name: 'Mike R.', amountOwed: 112.50, status: 'pending', avatar: 'https://i.pravatar.cc/150?u=2' },
        { id: '4', name: 'Jessica L.', amountOwed: 112.50, status: 'paid', avatar: 'https://i.pravatar.cc/150?u=3' },
    ],
    items: [
        { name: 'Sashimi Platter', price: 120.00 },
        { name: 'Wagyu Steak', price: 180.00 },
        { name: 'Omakase Selection', price: 150.00 },
    ]
};

export const SplitDetailPage = () => {
    const [split, setSplit] = useState<Split>(MOCK_SPLIT);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Simulate initial fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Simulate real-time updates (e.g. Mike R. paying after 10 seconds)
    useEffect(() => {
        if (isLoading) return;

        const timer = setTimeout(() => {
            setSplit(prev => {
                const newParticipants: Participant[] = prev.participants.map(p =>
                    p.id === '3' ? { ...p, status: 'paid' as const } : p
                );
                const allPaid = newParticipants.every(p => p.status === 'paid');
                return {
                    ...prev,
                    participants: newParticipants,
                    status: allPaid ? 'completed' : prev.status
                };
            });
        }, 10000);

        return () => clearTimeout(timer);
    }, [isLoading]);

    const currentUser = split.participants.find(p => p.isCurrentUser);
    const shouldShowPayment = currentUser && currentUser.status === 'pending';

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16">
                <LoadingSkeleton />
            </div>
        );
    }

    const handlePayment = async () => {
        if (!currentUser) return;

        setIsProcessingPayment(true);
        try {
            const result = await signAndSubmitPayment(currentUser.amountOwed, 'STELLAR_SPLIT_HUB');
            if (result.success) {
                setPaymentStatus('success');
                setSplit(prev => {
                    const newParticipants: Participant[] = prev.participants.map(p =>
                        p.isCurrentUser ? { ...p, status: 'paid' as const } : p
                    );
                    const allPaid = newParticipants.every(p => p.status === 'paid');
                    return {
                        ...prev,
                        participants: newParticipants,
                        status: allPaid ? 'completed' : prev.status
                    };
                });
                setTimeout(() => {
                    setIsPaymentModalOpen(false);
                    setPaymentStatus('idle');
                }, 1500);
            } else {
                setPaymentStatus('error');
                setTimeout(() => setPaymentStatus('idle'), 3000);
            }
        } catch (error) {
            setPaymentStatus('error');
            setTimeout(() => setPaymentStatus('idle'), 3000);
            console.error("Payment failed", error);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-32 md:pb-12">
            {/* Feedback Toast */}
            {paymentStatus !== 'idle' && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${paymentStatus === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {paymentStatus === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold">
                        {paymentStatus === 'success' ? 'Settled Successfully!' : 'Payment Failed. Try again.'}
                    </span>
                </div>
            )}
            {/* Top Navigation */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex justify-between items-center px-4 py-3 md:hidden">
                <button className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <span className="font-bold text-gray-900">Split Details</span>
                <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-2 -mr-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                >
                    <Share2 size={24} />
                </button>
            </div>

            <div className="max-w-lg mx-auto p-4 md:p-8">
                {/* Desktop Nav */}
                <div className="hidden md:flex justify-between items-center mb-8">
                    <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                        <div className="p-1 rounded-full bg-gray-100"><ChevronLeft size={20} /></div>
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-2 text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl font-bold transition-colors"
                    >
                        <Share2 size={18} /> Share Split
                    </button>
                </div>

                <SplitHeader split={split} />

                <ReceiptImage imageUrl={split.receiptUrl} />

                <ItemList
                    items={split.items || []}
                    currency={split.currency}
                />

                <ParticipantList
                    participants={split.participants}
                    currency={split.currency}
                />

                {shouldShowPayment && (
                    <PaymentButton
                        amount={currentUser.amountOwed}
                        currency={split.currency}
                        onClick={() => setIsPaymentModalOpen(true)}
                    />
                )}
            </div>

            {shouldShowPayment && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    amount={currentUser.amountOwed}
                    currency={split.currency}
                    onConfirm={handlePayment}
                    isProcessing={isProcessingPayment}
                />
            )}

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                splitLink={`https://stellarsplit.app/split/${split.id}`}
            />
        </div>
    );
};
