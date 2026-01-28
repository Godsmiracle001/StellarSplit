import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { EmailProcessor } from "./email.processor";
import { User } from "../entities/user.entity";
import * as nodemailer from "nodemailer";
import * as fs from "fs";

jest.mock("nodemailer");
jest.mock("fs");

describe("EmailProcessor", () => {
  let processor: EmailProcessor;
  let userRepository: any;
  let configService: any;
  let transporterMock: any;

  beforeEach(async () => {
    transporterMock = {
      sendMail: jest.fn().mockResolvedValue({}),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(transporterMock);

    userRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key, defaultVal) => defaultVal || key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  it("should send an email if user exists and preferences allow it", async () => {
    const job = {
      id: "1",
      data: {
        to: "test@example.com",
        type: "invitation",
        context: { inviterName: "John" },
      },
    } as any;

    const mockUser = {
      id: "user1",
      email: "test@example.com",
      emailPreferences: { invitations: true },
      lastEmailSentAt: null,
    };

    userRepository.findOne.mockResolvedValue(mockUser);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue("Hello {{inviterName}}");

    await processor.handleSendEmail(job);

    expect(transporterMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Invitation to join a new Split on StellarSplit",
      }),
    );
    expect(userRepository.update).toHaveBeenCalledWith("user1", {
      lastEmailSentAt: expect.any(Date),
    });
  });

  it("should not send an email if rate limit is exceeded", async () => {
    const job = {
      id: "1",
      data: {
        to: "test@example.com",
        type: "invitation",
        context: {},
      },
    } as any;

    const mockUser = {
      id: "user1",
      email: "test@example.com",
      lastEmailSentAt: new Date(Date.now() - 30000), // 30 seconds ago
    };

    userRepository.findOne.mockResolvedValue(mockUser);

    await processor.handleSendEmail(job);

    expect(transporterMock.sendMail).not.toHaveBeenCalled();
  });

  it("should not send an email if user disabled that type", async () => {
    const job = {
      id: "1",
      data: {
        to: "test@example.com",
        type: "invitation",
        context: {},
      },
    } as any;

    const mockUser = {
      id: "user1",
      email: "test@example.com",
      emailPreferences: { invitations: false },
      lastEmailSentAt: null,
    };

    userRepository.findOne.mockResolvedValue(mockUser);

    await processor.handleSendEmail(job);

    expect(transporterMock.sendMail).not.toHaveBeenCalled();
  });
});
