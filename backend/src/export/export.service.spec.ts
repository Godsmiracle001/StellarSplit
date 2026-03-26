import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bull";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ExportService } from "./export.service";
import { ConfigService } from "@nestjs/config";
import { ExportJob } from "./entities/export-job.entity";
import { ExportTemplate } from "./entities/export-template.entity";
import { PdfGeneratorService } from "./pdf-generator.service";
import { QuickBooksGeneratorService } from "./quickbooks-generator.service";
import { OfxGeneratorService } from "./ofx-generator.service";
import { EmailService } from "./email.service";
import { StorageService } from "./storage.service";
import { CsvGeneratorService } from "./csv-generator.service";

describe("ExportService", () => {
  let service: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getQueueToken("export"),
          useValue: {
            add: jest.fn(),
            getJob: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ExportJob),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ExportTemplate),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: PdfGeneratorService,
          useValue: { generatePdf: jest.fn() },
        },
        {
          provide: QuickBooksGeneratorService,
          useValue: { generateQbo: jest.fn() },
        },
        {
          provide: OfxGeneratorService,
          useValue: { generateOfx: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { sendExportEmail: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            getSignedUrl: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: CsvGeneratorService,
          useValue: {
            generateCsv: jest.fn(),
            generateXlsx: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
