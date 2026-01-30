// Mock typeorm to avoid glob/path-scurry requiring native bindings during module load
jest.mock("typeorm", () => {
  const actual = jest.requireActual("typeorm");
  return {
    __esModule: true,
    ...actual,
    DataSource: jest.fn().mockImplementation(() => ({ query: jest.fn() })),
  };
});

// Mock @nestjs/typeorm decorators so importing the processor doesn't load heavy typeorm internals
jest.mock("@nestjs/typeorm", () => ({
  InjectRepository: jest
    .fn()
    .mockImplementation(() => (target: any, key: any, index: any) => {}),
}));

const { AnalyticsProcessor } = require("./analytics.processor");
const fs = require("fs");

jest.mock("fs", () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
  },
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn((event, cb) => {
      if (event === "finish") setImmediate(cb);
    }),
    end: jest.fn(),
    write: jest.fn(),
  }),
}));

// Mock pg and pg-query-stream to simulate streaming rows
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockImplementation(() => {
        const EventEmitter = require("events");
        const s = new EventEmitter();
        // simulate async data events
        setImmediate(() => {
          s.emit("data", {
            period: "2025-01-01",
            total_spent: "100.00",
            tx_count: "2",
            avg_tx_amount: "50.00",
          });
          s.emit("end");
        });
        return s;
      }),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("AnalyticsProcessor streaming CSV", () => {
  it("streams spending trends to CSV file", async () => {
    const processor = new AnalyticsProcessor({} as any, {} as any, {} as any);

    // call private method via any cast
    const filePath = "/tmp/test-stream.csv";
    await (processor as any).streamCsvFromQuery(
      filePath,
      "SELECT 1",
      [],
      ["period", "total_spent", "tx_count", "avg_tx_amount"],
      "trends",
    );

    const fsMock = require("fs");
    expect(fsMock.promises.appendFile).toHaveBeenCalledWith(
      filePath,
      "trends\n",
    );
    // ensure createWriteStream was called to write header
    expect(fsMock.createWriteStream).toHaveBeenCalled();
  });
});
