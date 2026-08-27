import { QBOExporterService } from './qbo-exporter.service';
import { HistoricalRatesService } from '../historical-rates.service';

describe('QBOExporterService', () => {
    let service: QBOExporterService;
    let ratesService: HistoricalRatesService;

    beforeEach(() => {
        ratesService = {
            toDateString: jest.fn((date: Date) => date.toISOString().split('T')[0]),
            getXlmPricesForDates: jest.fn().mockResolvedValue(new Map([['2025-01-01', 2.01]])),
        } as any;
        service = new QBOExporterService(ratesService);
    });

    it('should generate a QBO/CSV with correct format', async () => {
        const mockSplit = {
            id: 'split-1',
            totalAmount: 50,
            description: 'Tools',
            createdAt: new Date('2025-01-01'),
        } as any;

        const result = await service.generate([mockSplit]);
        const lines = result.split('\n');

        expect(lines[0]).toBe('Date,Description,Amount');
        expect(lines[1]).toContain('1/1/2025');
        expect(lines[1]).toContain('Tools');
        expect(lines[1]).toContain('-100.50'); // Negative for expenses
    });

    it('should handle partial failure and output empty amount with rate unavailable note', async () => {
        const mockSplit1 = {
            id: 'split-1',
            totalAmount: 50,
            description: 'Tools',
            createdAt: new Date('2025-01-01'),
        } as any;
        const mockSplit2 = {
            id: 'split-2',
            totalAmount: 100,
            description: 'Failed Expense',
            createdAt: new Date('2025-01-02'),
        } as any;

        ratesService.getXlmPricesForDates = jest.fn().mockResolvedValue(
            new Map([
                ['2025-01-01', 2.01],
                ['2025-01-02', null],
            ]),
        );

        const result = await service.generate([mockSplit1, mockSplit2]);
        const lines = result.split('\n');

        expect(lines[1]).toContain('1/1/2025');
        expect(lines[1]).toContain('Tools');
        expect(lines[1]).toContain('-100.50');

        expect(lines[2]).toContain('1/2/2025');
        expect(lines[2]).toContain('Failed Expense (rate unavailable)');
        expect(lines[2].endsWith(',')).toBe(true);
    });
});
