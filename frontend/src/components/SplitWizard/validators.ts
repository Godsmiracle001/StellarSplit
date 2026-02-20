import type { WizardState } from '../../types/wizard';

type Errors = Record<string, string>;

export const validateBasicInfo = (
    value: Pick<WizardState, 'title' | 'currency' | 'totalAmount'>,
    t: (key: string) => string
): Errors => {
    const errors: Errors = {};
    if (!value.title.trim()) errors.title = t('wizard.validation.titleRequired');
    if (!value.currency) errors.currency = t('wizard.validation.currencyRequired');
    if (!value.totalAmount || value.totalAmount <= 0)
        errors.totalAmount = t('wizard.validation.totalAmountRequired');
    return errors;
};

export const validateParticipants = (
    value: Pick<WizardState, 'participants' | 'splitMethod' | 'totalAmount'>,
    t: (key: string) => string
): Errors => {
    const errors: Errors = {};
    if (value.participants.length < 2)
        errors.participants = t('wizard.validation.minParticipants');

    const hasUnnamed = value.participants.some((p) => !p.name.trim());
    if (hasUnnamed) errors.participants = t('wizard.validation.participantNameRequired');

    if (value.splitMethod === 'percentage') {
        const total = value.participants.reduce((acc, p) => acc + (p.percentage ?? 0), 0);
        if (Math.abs(total - 100) > 0.01)
            errors.participants = t('wizard.validation.percentageMustEqual100');
    }

    if (value.splitMethod === 'custom') {
        const total = value.participants.reduce((acc, p) => acc + (p.customAmount ?? 0), 0);
        if (Math.abs(total - value.totalAmount) > 0.01)
            errors.participants = t('wizard.validation.customMustEqualTotal');
    }

    return errors;
};

export const validateItems = (
    value: Pick<WizardState, 'items'>,
    t: (key: string) => string
): Errors => {
    const errors: Errors = {};
    if (value.items.length === 0)
        errors.items = t('wizard.validation.minOneItem');

    const hasUnnamed = value.items.some((i) => !i.name.trim());
    if (hasUnnamed) errors.items = t('wizard.validation.itemNameRequired');

    const hasZeroPrice = value.items.some((i) => i.price <= 0);
    if (hasZeroPrice) errors.items = t('wizard.validation.itemPriceRequired');

    return errors;
};
