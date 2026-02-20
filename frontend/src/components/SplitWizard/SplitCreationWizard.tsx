import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Save, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { StepIndicator } from './StepIndicator';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { SplitMethodStep } from './steps/SplitMethodStep';
import { ParticipantsStep } from './steps/ParticipantsStep';
import { ItemsStep } from './steps/ItemsStep';
import { TaxTipStep } from './steps/TaxTipStep';
import { ReviewStep } from './steps/ReviewStep';
import {
    validateBasicInfo,
    validateParticipants,
    validateItems,
} from './validators';
import type { WizardState } from '../../types/wizard';
import { INITIAL_WIZARD_STATE, WIZARD_DRAFT_KEY } from '../../types/wizard';

const loadDraft = (): WizardState => {
    try {
        const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
        if (raw) return JSON.parse(raw) as WizardState;
    } catch {
        // ignore corrupt drafts
    }
    return INITIAL_WIZARD_STATE;
};

export const SplitCreationWizard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [wizardState, setWizardState] = useState<WizardState>(loadDraft);
    const [currentStep, setCurrentStep] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);

    const isItemized = wizardState.splitMethod === 'itemized';

    const ALL_STEPS = [
        { label: t('wizard.steps.basicInfo') },
        { label: t('wizard.steps.splitMethod') },
        { label: t('wizard.steps.participants') },
        ...(isItemized ? [{ label: t('wizard.steps.items') }] : []),
        { label: t('wizard.steps.taxTip') },
        { label: t('wizard.steps.review') },
    ];

    // Map logical step index to a stable step id
    const STEP_IDS = [
        'basicInfo',
        'splitMethod',
        'participants',
        ...(isItemized ? ['items'] : []),
        'taxTip',
        'review',
    ];

    const currentStepId = STEP_IDS[currentStep];
    const totalSteps = ALL_STEPS.length;

    // Auto-save draft on every state change
    useEffect(() => {
        try {
            localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(wizardState));
        } catch {
            // storage full — ignore
        }
    }, [wizardState]);

    const patch = useCallback((p: Partial<WizardState>) => {
        setWizardState((prev) => ({ ...prev, ...p }));
        setErrors({});
    }, []);

    const validateCurrentStep = (): boolean => {
        let stepErrors: Record<string, string> = {};

        if (currentStepId === 'basicInfo') {
            stepErrors = validateBasicInfo(wizardState, t);
        } else if (currentStepId === 'participants') {
            stepErrors = validateParticipants(wizardState, t);
        } else if (currentStepId === 'items') {
            stepErrors = validateItems(wizardState, t);
        }

        setErrors(stepErrors);
        return Object.keys(stepErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateCurrentStep()) return;
        if (currentStep < totalSteps - 1) {
            setCurrentStep((s) => s + 1);
            setErrors({});
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
            setErrors({});
        }
    };

    const handleSaveDraft = () => {
        try {
            localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(wizardState));
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 2000);
        } catch {
            // ignore
        }
    };

    const handleSubmit = async () => {
        if (!validateCurrentStep()) return;
        setIsSubmitting(true);
        try {
            // Simulate async submission — replace with real API call
            await new Promise<void>((resolve) => setTimeout(resolve, 800));
            localStorage.removeItem(WIZARD_DRAFT_KEY);
            navigate('/dashboard');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStepId) {
            case 'basicInfo':
                return (
                    <BasicInfoStep
                        value={wizardState}
                        onChange={patch}
                        errors={errors}
                    />
                );
            case 'splitMethod':
                return (
                    <SplitMethodStep
                        value={wizardState}
                        onChange={patch}
                    />
                );
            case 'participants':
                return (
                    <ParticipantsStep
                        value={wizardState}
                        onChange={patch}
                        errors={errors}
                    />
                );
            case 'items':
                return (
                    <ItemsStep
                        value={wizardState}
                        onChange={patch}
                        errors={errors}
                    />
                );
            case 'taxTip':
                return (
                    <TaxTipStep
                        value={wizardState}
                        onChange={patch}
                        errors={errors}
                    />
                );
            case 'review':
                return <ReviewStep value={wizardState} />;
            default:
                return null;
        }
    };

    const isLastStep = currentStep === totalSteps - 1;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label={t('common.backToDashboard')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-base font-bold text-gray-900">
                        {t('wizard.pageTitle')}
                    </h1>
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all
                            ${draftSaved
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        <Save size={13} />
                        {draftSaved ? t('wizard.draftSaved') : t('wizard.saveDraft')}
                    </button>
                </div>
                <StepIndicator steps={ALL_STEPS} currentStep={currentStep} />
            </div>

            {/* Step content */}
            <div className="max-w-lg mx-auto px-4 py-6">
                {renderStep()}
            </div>

            {/* Navigation footer */}
            <div className="sticky bottom-0 z-20 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
                    {currentStep > 0 && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors min-h-[44px]"
                        >
                            <ArrowLeft size={16} />
                            {t('wizard.back')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={isLastStep ? handleSubmit : handleNext}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 active:scale-[0.98] transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">{t('wizard.creating')}</span>
                        ) : isLastStep ? (
                            <>
                                <CheckCircle size={16} />
                                {t('wizard.createSplit')}
                            </>
                        ) : (
                            <>
                                {t('wizard.next')}
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
