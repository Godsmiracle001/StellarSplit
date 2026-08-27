import { CSVExporterService } from './csv-exporter.service';
import { HistoricalRatesService } from '../historical-rates.service';

describe('CSVExporterService', () => {
    let service: CSVExporterService;
    let ratesService: HistoricalRatesService;

    beforeEach(() => {
        ratesService = {
            toDateString: jest.fn((date: Date) => date.toISOString().split('T')[0]),
            getXlmPricesForDates: jest.fn().mockResolvedValue(new Map([['2025-01-01', 2.01]])),
        } as any;
        service = new CSVExporterService(ratesService);
    });

    it('should generate a CSV with correct headers and data', async () => {
        const mockSplit = {
            id: 'split-1',
            totalAmount: 50,
            description: 'Business Lunch',
            createdAt: new Date('2025-01-01'),
            category: { name: 'Meals', taxDeductible: true },
        } as any;

        const result = await service.generate([mockSplit]);
        const lines = result.split('\n');

        expect(lines[0]).toBe('Date,Description,Category,XLM Amount,Fiat Amount (USD),Tax Deductible');
        expect(lines[1]).toContain('2025-01-01');
        expect(lines[1]).toContain('Business Lunch');
        expect(lines[1]).toContain('Meals');
        expect(lines[1]).toContain('50');
        expect(lines[1]).toContain('100.50');
        expect(lines[1]).toContain('Yes');
    });

    it('should handle partial failure and output "rate unavailable"', async () => {
        const mockSplit1 = {
            id: 'split-1',
            totalAmount: 50,
            description: 'Business Lunch',
            createdAt: new Date('2025-01-01'),
            category: { name: 'Meals', taxDeductible: true },
        } as any;
        const mockSplit2 = {
            id: 'split-2',
            totalAmount: 100,
            description: 'Tax Software',
            createdAt: new Date('2025-01-02'),
            category: { name: 'Software', taxDeductible: true },
        } as any;

        ratesService.getXlmPricesForDates = jest.fn().mockResolvedValue(
            new Map([
                ['2025-01-01', 2.01],
                ['2025-01-02', null],
            ]),
        );

        const result = await service.generate([mockSplit1, mockSplit2]);
        const lines = result.split('\n');

        expect(lines[1]).toContain('2025-01-01');
        expect(lines[1]).toContain('100.50');

        expect(lines[2]).toContain('2025-01-02');
        expect(lines[2]).toContain('rate unavailable');
    });
});
