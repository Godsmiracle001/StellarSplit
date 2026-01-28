import { Test, TestingModule } from "@nestjs/testing";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { NotFoundException } from "@nestjs/common";

describe("EmailController", () => {
  let controller: EmailController;
  let service: any;

  beforeEach(async () => {
    service = {
      getUser: jest.fn(),
      updatePreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should get preferences for a user", async () => {
    const mockUser = {
      id: "u1",
      emailPreferences: { invitations: true, reminders: false },
    };
    service.getUser.mockResolvedValue(mockUser);

    const result = await controller.getPreferences("u1");
    expect(result).toEqual(mockUser.emailPreferences);
  });

  it("should throw NotFoundException if user not found while getting preferences", async () => {
    service.getUser.mockResolvedValue(null);
    await expect(controller.getPreferences("u1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should update preferences for a user", async () => {
    const mockUser = {
      id: "u1",
      emailPreferences: { invitations: true, reminders: true },
    };
    service.getUser.mockResolvedValue(mockUser);

    const dto = { invitations: false };
    const result = await controller.updatePreferences("u1", dto);

    expect(result.invitations).toBe(false);
    expect(result.reminders).toBe(true);
    expect(service.updatePreferences).toHaveBeenCalledWith("u1", {
      invitations: false,
      reminders: true,
    });
  });
});
