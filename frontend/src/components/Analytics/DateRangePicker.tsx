import type { DateRange } from '../../types/analytics';

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
                From
                <input
                    type="date"
                    value={value.dateFrom}
                    onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
                To
                <input
                    type="date"
                    value={value.dateTo}
                    onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </label>
        </div>
    );
}
