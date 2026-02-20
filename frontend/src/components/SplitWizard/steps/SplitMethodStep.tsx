import { useTranslation } from 'react-i18next';
import { Equal, List, Percent, Sliders } from 'lucide-react';
import type { SplitMethod, WizardState } from '../../../types/wizard';

interface SplitMethodStepProps {
    value: Pick<WizardState, 'splitMethod'>;
    onChange: (patch: Partial<WizardState>) => void;
}

interface MethodOption {
    id: SplitMethod;
    icon: React.ReactNode;
    labelKey: string;
    descKey: string;
}

const METHOD_OPTIONS: MethodOption[] = [
    {
        id: 'equal',
        icon: <Equal size={22} />,
        labelKey: 'wizard.splitMethod.equal',
        descKey: 'wizard.splitMethod.equalDesc',
    },
    {
        id: 'itemized',
        icon: <List size={22} />,
        labelKey: 'wizard.splitMethod.itemized',
        descKey: 'wizard.splitMethod.itemizedDesc',
    },
    {
        id: 'percentage',
        icon: <Percent size={22} />,
        labelKey: 'wizard.splitMethod.percentage',
        descKey: 'wizard.splitMethod.percentageDesc',
    },
    {
        id: 'custom',
        icon: <Sliders size={22} />,
        labelKey: 'wizard.splitMethod.custom',
        descKey: 'wizard.splitMethod.customDesc',
    },
];

export const SplitMethodStep = ({ value, onChange }: SplitMethodStepProps) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">{t('wizard.splitMethod.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('wizard.splitMethod.subtitle')}</p>
            </div>

            <div className="space-y-3">
                {METHOD_OPTIONS.map((option) => {
                    const isSelected = value.splitMethod === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onChange({ splitMethod: option.id })}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200
                                ${isSelected
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <div className={`p-2.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                {option.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                                    {t(option.labelKey)}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">{t(option.descKey)}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                                ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
