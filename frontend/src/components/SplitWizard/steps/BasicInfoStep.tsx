import { useTranslation } from 'react-i18next';
import type { WizardState } from '../../../types/wizard';
import { SUPPORTED_CURRENCIES } from '../../../types/wizard';

interface BasicInfoStepProps {
    value: Pick<WizardState, 'title' | 'currency' | 'totalAmount'>;
    onChange: (patch: Partial<WizardState>) => void;
    errors: Record<string, string>;
}

export const BasicInfoStep = ({ value, onChange, errors }: BasicInfoStepProps) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">{t('wizard.basicInfo.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('wizard.basicInfo.subtitle')}</p>
            </div>

            {/* Split Title */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700" htmlFor="split-title">
                    {t('wizard.basicInfo.splitTitle')} <span className="text-red-500">*</span>
                </label>
                <input
                    id="split-title"
                    type="text"
                    value={value.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder={t('wizard.basicInfo.splitTitlePlaceholder')}
                    className={`w-full px-4 py-3 rounded-xl border text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow
                        ${errors.title ? 'border-red-400 focus:ring-red-300' : 'border-gray-200'}`}
                />
                {errors.title && (
                    <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                )}
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700" htmlFor="currency">
                    {t('wizard.basicInfo.currency')} <span className="text-red-500">*</span>
                </label>
                <select
                    id="currency"
                    value={value.currency}
                    onChange={(e) => onChange({ currency: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow appearance-none"
                >
                    {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                </select>
            </div>

            {/* Total Amount */}
            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700" htmlFor="total-amount">
                    {t('wizard.basicInfo.totalAmount')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                        {value.currency}
                    </span>
                    <input
                        id="total-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={value.totalAmount === 0 ? '' : value.totalAmount}
                        onChange={(e) => onChange({ totalAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className={`w-full pl-14 pr-4 py-3 rounded-xl border text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow
                            ${errors.totalAmount ? 'border-red-400 focus:ring-red-300' : 'border-gray-200'}`}
                    />
                </div>
                {errors.totalAmount && (
                    <p className="text-xs text-red-500 mt-1">{errors.totalAmount}</p>
                )}
            </div>
        </div>
    );
};

