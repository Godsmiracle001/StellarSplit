import { usePWA } from '../hooks/usePWA';

const InstallPrompt = () => {
  const { installPrompt, installApp } = usePWA();

  if (!installPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg">
      <p>Install StellarSplit for a better experience</p>
      <button
        onClick={installApp}
        className="mt-2 bg-blue-600 px-4 py-2 rounded"
      >
        Install
      </button>
    </div>
  );
};

export default InstallPrompt;