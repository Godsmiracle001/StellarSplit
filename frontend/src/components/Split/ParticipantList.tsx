import { CheckCircle2 } from 'lucide-react';
import type { Participant } from '../../types';

interface ParticipantListProps {
    participants: Participant[];
    currency: string;
}

export const ParticipantList = ({ participants, currency }: ParticipantListProps) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-24 md:mb-6">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Participants</h3>
                <span className="text-xs font-medium text-gray-400">{participants.length} people</span>
            </div>
            <div className="divide-y divide-gray-50">
                {participants.map((person) => (
                    <div key={person.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${person.isCurrentUser ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                    {person.avatar ? (
                                        <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        person.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                {person.status === 'paid' && (
                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                        <CheckCircle2 size={14} className="text-green-500 fill-current" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900 flex items-center gap-2">
                                    {person.name}
                                    {person.isCurrentUser && <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded tracking-wide">You</span>}
                                </span>
                                <span className={`text-xs flex items-center gap-1 font-medium ${person.status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                                    {person.status === 'paid' ? 'Settled' : 'Pending'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${person.status === 'paid' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                {currency === 'USD' ? '$' : currency}{person.amountOwed.toFixed(2)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
