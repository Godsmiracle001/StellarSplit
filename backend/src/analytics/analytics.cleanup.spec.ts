// Mock aws sdk S3 client
jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest
      .fn()
      .mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
    DeleteObjectCommand: jest
      .fn()
      .mockImplementation((args: any) => ({ args })),
    PutObjectCommand: jest.fn().mockImplementation((args: any) => ({ args })),
  } as any;
});

// Mock fs.promises.unlink
jest.mock("fs", () => ({
  promises: {
    unlink: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from("csv")),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn((event, cb) => {
      if (event === "finish") setImmediate(cb);
    }),
    end: jest.fn(),
    write: jest.fn(),
  }),
}));

const { cleanupOldReportsHelper } = require("./cleanup.helper");

describe("cleanupOldReportsHelper", () => {
  const mockReportsRepo: any = {
    update: jest.fn().mockResolvedValue(undefined),
  };
  const mockDataSource: any = {
    query: jest.fn(),
  };
  const logger = { debug: jest.fn(), error: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Prepare dataSource to return two reports: one S3, one local
    mockDataSource.query.mockResolvedValueOnce([
      {
        id: "r1",
        file_path: "s3://test-bucket/analytics-reports/r1.csv",
        file_name: "r1.csv",
      },
      { id: "r2", file_path: "/tmp/reports/r2.csv", file_name: "r2.csv" },
    ]);
  });

  it("deletes S3 and local files and marks reports as deleted", async () => {
    // Run cleanup with small retention
    await cleanupOldReportsHelper(
      mockDataSource as any,
      mockReportsRepo as any,
      logger,
      1,
    );

    // dataSource.query should have been called to select old reports
    expect(mockDataSource.query).toHaveBeenCalled();

    // S3 client send should be called for r1
    const { S3Client } = require("@aws-sdk/client-s3");
    expect(S3Client).toHaveBeenCalled();
    const s3Instance = (S3Client as jest.Mock).mock.results[0].value;
    expect(s3Instance.send).toHaveBeenCalled();

    // fs.unlink should be called for local file r2
    const fs = require("fs");
    expect(fs.promises.unlink).toHaveBeenCalledWith("/tmp/reports/r2.csv");

    // Reports repo update called to mark deleted
    expect(mockReportsRepo.update).toHaveBeenCalledWith(
      { id: "r1" },
      expect.objectContaining({ status: "deleted" }),
    );
    expect(mockReportsRepo.update).toHaveBeenCalledWith(
      { id: "r2" },
      expect.objectContaining({ status: "deleted" }),
    );
  });
});
