/**
 * Mock utility for Stellar wallet integration
 * In a real app, this would use @stellar/freighter-api or other wallet SDKs
 */

export const connectWallet = async () => {
    // Simulate wallet connection delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return "GBAN...45X";
};

export const signAndSubmitPayment = async (amount: number, destination: string) => {
    console.log(`Signing transaction: Pay ${amount} to ${destination}`);
    // Simulate transaction signing and submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
        success: true,
        txHash: "7b8...a12"
    };
};
