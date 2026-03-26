import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthorizationGuard } from "../guards/authorization.guard";
import { AuthorizationService } from "../services/authorization.service";

describe("Authorization Integration Tests", () => {
  let authorizationGuard: AuthorizationGuard;
  let authorizationService: AuthorizationService;
  let reflector: Reflector;

  const mockUser1 = { id: "user-1", walletAddress: "wallet-1" };
  const mockUser2 = { id: "user-2", walletAddress: "wallet-2" };
  const mockSplitId = "split-123";
  const mockReceiptId = "receipt-123";
  const mockDisputeId = "dispute-123";
  const mockGroupId = "group-123";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorizationGuard, AuthorizationService, Reflector],
    })
      .overrideProvider(AuthorizationService)
      .useValue({
        canAccessSplit: jest.fn(),
        canCreatePayment: jest.fn(),
        canAddParticipant: jest.fn(),
        canRemoveParticipant: jest.fn(),
        canCreatePaymentForParticipant: jest.fn(),
        canAccessParticipantPayments: jest.fn(),
        canAccessReceipt: jest.fn(),
        canAccessDispute: jest.fn(),
        isAdmin: jest.fn(),
        canAccessGroup: jest.fn(),
        canManageGroupMembers: jest.fn(),
        canCreateGroupSplit: jest.fn(),
      })
      .compile();

    authorizationGuard = module.get<AuthorizationGuard>(AuthorizationGuard);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe("Cross-user access prevention", () => {
    it("should prevent user from accessing another user's split", async () => {
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
      });
      const permissions = [{ resource: "split" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canAccessSplit")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should prevent user from creating payment for another user's split", async () => {
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
      });
      const permissions = [
        { resource: "split" as const, action: "create_payment" },
      ];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canCreatePayment")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should prevent user from accessing another user's receipt", async () => {
      const mockContext = createMockContext(mockUser1, {
        receiptId: mockReceiptId,
      });
      const permissions = [{ resource: "receipt" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canAccessReceipt")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should prevent user from accessing another user's dispute", async () => {
      const mockContext = createMockContext(mockUser1, {
        disputeId: mockDisputeId,
      });
      const permissions = [{ resource: "dispute" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canAccessDispute")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should prevent user from managing another user's group", async () => {
      const mockContext = createMockContext(mockUser1, { id: mockGroupId });
      const permissions = [
        { resource: "group" as const, action: "add_member" },
      ];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canManageGroupMembers")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should allow access when user has proper permissions", async () => {
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
      });
      const permissions = [{ resource: "split" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canAccessSplit")
        .mockResolvedValue(true);

      const result = await authorizationGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it("should allow access when no permissions are required", async () => {
      const mockContext = createMockContext(mockUser1, {});

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const result = await authorizationGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it("should throw UnauthorizedException when user is not authenticated", async () => {
      const mockContext = createMockContext(null, { splitId: mockSplitId });
      const permissions = [{ resource: "split" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("Permission-based access control", () => {
    it("should check multiple permissions when required", async () => {
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
      });
      const permissions = [
        { resource: "split" as const, action: "read" },
        { resource: "split" as const, action: "create_payment" },
      ];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canAccessSplit")
        .mockResolvedValue(true);
      jest
        .spyOn(authorizationService, "canCreatePayment")
        .mockResolvedValue(true);

      const result = await authorizationGuard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(authorizationService.canAccessSplit).toHaveBeenCalledWith(
        mockUser1.id,
        mockSplitId,
      );
      expect(authorizationService.canCreatePayment).toHaveBeenCalledWith(
        mockUser1.id,
        mockSplitId,
      );
    });

    it("should deny access when any required permission fails", async () => {
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
      });
      const permissions = [
        { resource: "split" as const, action: "read" },
        { resource: "split" as const, action: "create_payment" },
      ];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canAccessSplit")
        .mockResolvedValue(true);
      jest
        .spyOn(authorizationService, "canCreatePayment")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("Resource-specific authorization", () => {
    it("should handle split-specific authorization correctly", async () => {
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
      });

      // Test read permission
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([{ resource: "split" as const, action: "read" }]);
      jest
        .spyOn(authorizationService, "canAccessSplit")
        .mockResolvedValue(true);

      const result = await authorizationGuard.canActivate(mockContext);
      expect(result).toBe(true);

      // Test update permission
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([{ resource: "split" as const, action: "update" }]);
      jest
        .spyOn(authorizationService, "canAccessSplit")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should handle payment-specific authorization correctly", async () => {
      const participantId = "participant-123";
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
        participantId,
      });

      // Test payment creation for participant
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([{ resource: "payment" as const, action: "create" }]);
      jest
        .spyOn(authorizationService, "canCreatePaymentForParticipant")
        .mockResolvedValue(true);

      const result = await authorizationGuard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(
        authorizationService.canCreatePaymentForParticipant,
      ).toHaveBeenCalledWith(mockUser1.id, mockSplitId, participantId);
    });

    it("should handle group-specific authorization correctly", async () => {
      const mockContext = createMockContext(mockUser1, { id: mockGroupId });

      // Test group management
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([
          { resource: "group" as const, action: "add_member" },
        ]);
      jest
        .spyOn(authorizationService, "canManageGroupMembers")
        .mockResolvedValue(false);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle missing resource IDs gracefully", async () => {
      const mockContext = createMockContext(mockUser1, {});
      const permissions = [{ resource: "split" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should handle null/undefined user context", async () => {
      const mockContext = createMockContext(null, { splitId: mockSplitId });
      const permissions = [{ resource: "split" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should handle authorization service errors gracefully", async () => {
      const mockContext = createMockContext(mockUser1, {
        splitId: mockSplitId,
      });
      const permissions = [{ resource: "split" as const, action: "read" }];

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permissions);
      jest
        .spyOn(authorizationService, "canAccessSplit")
        .mockRejectedValue(new Error("Database error"));

      await expect(authorizationGuard.canActivate(mockContext)).rejects.toThrow(
        "Database error",
      );
    });
  });

  function createMockContext(user: any, params: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          body: {},
        }),
      }),
    } as ExecutionContext;
  }
});
