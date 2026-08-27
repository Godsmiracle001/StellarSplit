import { Injectable } from '@nestjs/common';
import { Split } from '../../entities/split.entity';
import { HistoricalRatesService } from '../historical-rates.service';

@Injectable()
export class CSVExporterService {
    constructor(private readonly ratesService: HistoricalRatesService) { }

    async generate(splits: Split[]): Promise<string> {
        const headers = ['Date', 'Description', 'Category', 'XLM Amount', 'Fiat Amount (USD)', 'Tax Deductible'];
        const dates = splits.map((s) => s.createdAt);
        const ratesMap = await this.ratesService.getXlmPricesForDates(dates);

        const rows = splits.map((split) => {
            const dateStr = this.ratesService.toDateString(split.createdAt);
            const rate = ratesMap.get(dateStr);

            let fiatAmountStr = 'rate unavailable';
            if (rate !== null && rate !== undefined) {
                const fiatAmount = Number(split.totalAmount) * rate;
                fiatAmountStr = fiatAmount.toFixed(2);
            }

            return [
                dateStr,
                `"${split.description || ''}"`,
                split.category?.name || 'Uncategorized',
                split.totalAmount,
                fiatAmountStr,
                split.category?.taxDeductible ? 'Yes' : 'No',
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }
}
