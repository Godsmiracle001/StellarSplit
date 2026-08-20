import { Check } from 'lucide-react';

interface Step {
    label: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (stepIndex: number) => void;
}

export const StepIndicator = ({ steps, currentStep, onStepClick }: StepIndicatorProps) => {
    const currentStepLabel = steps[currentStep]?.label;

    return (
        <nav
            className="w-full px-4 py-4"
            aria-label={currentStepLabel
                ? `Step ${currentStep + 1} of ${steps.length}: ${currentStepLabel}`
                : 'Wizard progress'}
        >
            <div className="relative">
                {/* Connecting line */}
                <div aria-hidden="true" className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
                <div
                    aria-hidden="true"
                    className="absolute top-4 left-0 h-0.5 bg-purple-500 z-0 transition-all duration-500"
                    style={{
                        width: steps.length > 1
                            ? `${(currentStep / (steps.length - 1)) * 100}%`
                            : '0%',
                    }}
                />

                <ol className="flex items-center justify-between relative list-none m-0 p-0">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isActive = index === currentStep;
                        const stepLabel = `Step ${index + 1} of ${steps.length}: ${step.label}`;
                        const markerClassName = `w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-xs font-bold
                        ${isCompleted
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : isActive
                                ? 'bg-white border-purple-500 text-purple-600'
                                : 'bg-white border-gray-300 text-gray-400'
                        }`;

                        const marker = (
                            <>
                                <span aria-hidden="true">
                                    {isCompleted ? <Check size={14} /> : index + 1}
                                </span>
                                <span className="sr-only">{stepLabel}</span>
                            </>
                        );

                        return (
                            <li
                                key={step.label}
                                className="flex flex-col items-center z-10 flex-1"
                                aria-current={isActive ? 'step' : undefined}
                                aria-disabled={index > currentStep ? true : undefined}
                            >
                                {isCompleted && onStepClick ? (
                                    <button
                                        type="button"
                                        className={`${markerClassName} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer`}
                                        onClick={() => onStepClick(index)}
                                    >
                                        {marker}
                                    </button>
                                ) : (
                                    <div className={markerClassName}>{marker}</div>
                                )}
                                <span
                                    aria-hidden="true"
                                    className={`mt-1.5 text-[10px] font-medium text-center leading-tight hidden sm:block
                                    ${isActive ? 'text-purple-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}
                                >
                                    {step.label}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </nav>
    );
};
