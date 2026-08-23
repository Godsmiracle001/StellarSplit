import { StrKey } from '@stellar/stellar-sdk';
import type { WizardState } from '../../types/wizard';

/** Returns true if the trimmed address is a syntactically valid Stellar Ed25519 public key. */
export const isValidStellarAddress = (address: string): boolean => {
    const trimmed = address.trim();
    return trimmed.length > 0 && StrKey.isValidEd25519PublicKey(trimmed);
};

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
    if (value.participants.length < 1)
        errors.participants = 'Add at least one participant';

    const hasUnnamed = value.participants.some((p) => !p.name.trim());
    if (hasUnnamed) errors.participants = t('wizard.validation.participantNameRequired');

    // Check for non-empty but invalid wallet addresses (more specific error)
    const hasInvalidWallet = value.participants.some(
        (p) => p.walletAddress && p.walletAddress.trim().length > 0 && !StrKey.isValidEd25519PublicKey(p.walletAddress.trim())
    );
    if (hasInvalidWallet) {
        errors.participants = t('wizard.validation.invalidWalletAddress');
    } else {
        // Then check if at least one valid wallet exists
        const hasValidWallet = value.participants.some(
            (p) => p.walletAddress && StrKey.isValidEd25519PublicKey(p.walletAddress.trim())
        );
        if (!hasValidWallet) errors.participants = 'Add at least one participant with a valid wallet address';
    }

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
        errors.items = 'Add at least one item';

    const hasUnnamed = value.items.some((i) => !i.name.trim());
    if (hasUnnamed) errors.items = t('wizard.validation.itemNameRequired');

    const hasPositiveAmount = value.items.some((i) => i.price > 0);
    if (!hasPositiveAmount) errors.items = 'Add at least one item with a positive amount';

    const hasZeroPrice = value.items.some((i) => i.price <= 0);
    if (hasZeroPrice) errors.items = t('wizard.validation.itemPriceRequired');

    return errors;
};
