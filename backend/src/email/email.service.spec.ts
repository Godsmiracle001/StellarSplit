import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bull";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EmailService } from "./email.service";
import { User } from "../entities/user.entity";

describe("EmailService", () => {
  let service: EmailService;
  let queue: any;

  beforeEach(async () => {
    queue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: getQueueToken("email_queue"),
          useValue: queue,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            update: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should add an invitation email to the queue", async () => {
    const context = {
      inviterName: "John",
      splitDescription: "Dinner",
      amount: 50,
      joinLink: "http://link",
    };
    await service.sendInvitation("test@example.com", context);
    expect(queue.add).toHaveBeenCalledWith("sendEmail", {
      to: "test@example.com",
      type: "invitation",
      context,
    });
  });

  it("should add a payment confirmation email to the queue", async () => {
    const context = { amount: 20, splitDescription: "Rent", txHash: "0x123" };
    await service.sendPaymentConfirmation("test@example.com", context);
    expect(queue.add).toHaveBeenCalledWith("sendEmail", {
      to: "test@example.com",
      type: "confirmation",
      context,
    });
  });
});
