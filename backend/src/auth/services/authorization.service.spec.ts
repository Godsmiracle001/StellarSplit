import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationService } from './authorization.service';
import { Split } from '../../entities/split.entity';
import { Participant } from '../../entities/participant.entity';
import { Receipt } from '../../receipts/entities/receipt.entity';
import { Dispute } from '../../entities/dispute.entity';
import { Group } from '../../group/entities/group.entity';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let splitRepository: Repository<Split>;
  let participantRepository: Repository<Participant>;
  let receiptRepository: Repository<Receipt>;
  let disputeRepository: Repository<Dispute>;
  let groupRepository: Repository<Group>;

  const mockUserId = 'user-123';
  const mockSplitId = 'split-123';
  const mockReceiptId = 'receipt-123';
  const mockDisputeId = 'dispute-123';
  const mockGroupId = 'group-123';
  const mockCreatorWallet = 'creator-wallet';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: getRepositoryToken(Split),
          useValue: {
            findOne: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Receipt),
          useValue: {
            findOne: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Dispute),
          useValue: {
            findOne: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Group),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    splitRepository = module.get<Repository<Split>>(getRepositoryToken(Split));
    participantRepository = module.get<Repository<Participant>>(getRepositoryToken(Participant));
    receiptRepository = module.get<Repository<Receipt>>(getRepositoryToken(Receipt));
    disputeRepository = module.get<Repository<Dispute>>(getRepositoryToken(Dispute));
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('canAccessSplit', () => {
    it('should allow access for split creator', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: mockUserId,
        participants: [],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canAccessSplit(mockUserId, mockSplitId);
      expect(result).toBe(true);
    });

    it('should allow access for participant', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: 'different-wallet',
        participants: [{ userId: mockUserId }],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canAccessSplit(mockUserId, mockSplitId);
      expect(result).toBe(true);
    });

    it('should deny access for non-participant', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: 'different-wallet',
        participants: [{ userId: 'different-user' }],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canAccessSplit(mockUserId, mockSplitId);
      expect(result).toBe(false);
    });

    it('should deny access for non-existent split', async () => {
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(null);

      const result = await service.canAccessSplit(mockUserId, mockSplitId);
      expect(result).toBe(false);
    });
  });

  describe('canCreatePayment', () => {
    it('should allow payment creation for split participant', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: 'different-wallet',
        participants: [{ userId: mockUserId }],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canCreatePayment(mockUserId, mockSplitId);
      expect(result).toBe(true);
    });
  });

  describe('canAddParticipant', () => {
    it('should allow creator to add participants', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: mockUserId,
        participants: [],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canAddParticipant(mockUserId, mockSplitId);
      expect(result).toBe(true);
    });

    it('should allow participant to add participants', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: 'different-wallet',
        participants: [{ userId: mockUserId }],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canAddParticipant(mockUserId, mockSplitId);
      expect(result).toBe(true);
    });
  });

  describe('canRemoveParticipant', () => {
    it('should allow creator to remove participants', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: mockUserId,
        participants: [],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canRemoveParticipant(mockUserId, mockSplitId);
      expect(result).toBe(true);
    });

    it('should deny non-creator from removing participants', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: 'different-wallet',
        participants: [{ userId: mockUserId }],
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);

      const result = await service.canRemoveParticipant(mockUserId, mockSplitId);
      expect(result).toBe(false);
    });
  });

  describe('canCreatePaymentForParticipant', () => {
    const mockParticipantId = 'participant-123';

    it('should allow user to create payment for themselves', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: 'different-wallet',
        participants: [{ userId: mockUserId }],
      };
      const mockParticipant = {
        id: mockParticipantId,
        splitId: mockSplitId,
        userId: mockUserId,
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);
      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(mockParticipant as any);

      const result = await service.canCreatePaymentForParticipant(
        mockUserId,
        mockSplitId,
        mockParticipantId,
      );
      expect(result).toBe(true);
    });

    it('should allow creator to create payment for any participant', async () => {
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: mockUserId,
        participants: [{ userId: 'different-user' }],
      };
      const mockParticipant = {
        id: mockParticipantId,
        splitId: mockSplitId,
        userId: 'different-user',
      };
      jest.spyOn(splitRepository, 'findOne').mockResolvedValue(mockSplit as any);
      jest.spyOn(participantRepository, 'findOne').mockResolvedValue(mockParticipant as any);

      const result = await service.canCreatePaymentForParticipant(
        mockUserId,
        mockSplitId,
        mockParticipantId,
      );
      expect(result).toBe(true);
    });
  });

  describe('canAccessReceipt', () => {
    it('should allow access to receipt for accessible split', async () => {
      const mockReceipt = { id: mockReceiptId, splitId: mockSplitId };
      const mockSplit = {
        id: mockSplitId,
        creatorWalletAddress: mockUserId,
        participants: [],
      };
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(mockReceipt as any);
      jest.spyOn(service, 'canAccessSplit').mockResolvedValue(true);

      const result = await service.canAccessReceipt(mockUserId, mockReceiptId);
      expect(result).toBe(true);
    });

    it('should deny access to receipt for inaccessible split', async () => {
      const mockReceipt = { id: mockReceiptId, splitId: mockSplitId };
      jest.spyOn(receiptRepository, 'findOne').mockResolvedValue(mockReceipt as any);
      jest.spyOn(service, 'canAccessSplit').mockResolvedValue(false);

      const result = await service.canAccessReceipt(mockUserId, mockReceiptId);
      expect(result).toBe(false);
    });
  });

  describe('canAccessDispute', () => {
    it('should allow access to dispute for accessible split', async () => {
      const mockDispute = { id: mockDisputeId, splitId: mockSplitId };
      jest.spyOn(disputeRepository, 'findOne').mockResolvedValue(mockDispute as any);
      jest.spyOn(service, 'canAccessSplit').mockResolvedValue(true);

      const result = await service.canAccessDispute(mockUserId, mockDisputeId);
      expect(result).toBe(true);
    });

    it('should deny access to dispute for inaccessible split', async () => {
      const mockDispute = { id: mockDisputeId, splitId: mockSplitId };
      jest.spyOn(disputeRepository, 'findOne').mockResolvedValue(mockDispute as any);
      jest.spyOn(service, 'canAccessSplit').mockResolvedValue(false);

      const result = await service.canAccessDispute(mockUserId, mockDisputeId);
      expect(result).toBe(false);
    });
  });

  describe('canAccessGroup', () => {
    it('should allow access for group creator', async () => {
      const mockGroup = {
        id: mockGroupId,
        creatorId: mockUserId,
        members: [],
      };
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(mockGroup as any);

      const result = await service.canAccessGroup(mockUserId, mockGroupId);
      expect(result).toBe(true);
    });

    it('should allow access for group member', async () => {
      const mockGroup = {
        id: mockGroupId,
        creatorId: 'different-user',
        members: [{ wallet: mockUserId, role: 'member' }],
      };
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(mockGroup as any);

      const result = await service.canAccessGroup(mockUserId, mockGroupId);
      expect(result).toBe(true);
    });

    it('should deny access for non-member', async () => {
      const mockGroup = {
        id: mockGroupId,
        creatorId: 'different-user',
        members: [{ wallet: 'different-wallet', role: 'member' }],
      };
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(mockGroup as any);

      const result = await service.canAccessGroup(mockUserId, mockGroupId);
      expect(result).toBe(false);
    });
  });

  describe('canManageGroupMembers', () => {
    it('should allow creator to manage members', async () => {
      const mockGroup = {
        id: mockGroupId,
        creatorId: mockUserId,
        members: [],
      };
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(mockGroup as any);

      const result = await service.canManageGroupMembers(mockUserId, mockGroupId);
      expect(result).toBe(true);
    });

    it('should allow admin to manage members', async () => {
      const mockGroup = {
        id: mockGroupId,
        creatorId: 'different-user',
        members: [{ wallet: mockUserId, role: 'admin' }],
      };
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(mockGroup as any);

      const result = await service.canManageGroupMembers(mockUserId, mockGroupId);
      expect(result).toBe(true);
    });

    it('should deny non-admin from managing members', async () => {
      const mockGroup = {
        id: mockGroupId,
        creatorId: 'different-user',
        members: [{ wallet: mockUserId, role: 'member' }],
      };
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(mockGroup as any);

      const result = await service.canManageGroupMembers(mockUserId, mockGroupId);
      expect(result).toBe(false);
    });
  });

  describe('filterAccessibleSplits', () => {
    it('should filter splits accessible to user', async () => {
      const mockSplits = [
        {
          id: 'split-1',
          creatorWalletAddress: mockUserId,
          participants: [],
        },
        {
          id: 'split-2',
          creatorWalletAddress: 'different-wallet',
          participants: [{ userId: mockUserId }],
        },
        {
          id: 'split-3',
          creatorWalletAddress: 'different-wallet',
          participants: [{ userId: 'different-user' }],
        },
      ];
      jest.spyOn(splitRepository, 'findByIds').mockResolvedValue(mockSplits as any);

      const result = await service.filterAccessibleSplits(mockUserId, ['split-1', 'split-2', 'split-3']);
      expect(result).toEqual(['split-1', 'split-2']);
    });
  });

  describe('filterAccessibleReceipts', () => {
    it('should filter receipts accessible to user', async () => {
      const mockReceipts = [
        { id: 'receipt-1', splitId: 'split-1' },
        { id: 'receipt-2', splitId: 'split-2' },
        { id: 'receipt-3', splitId: 'split-3' },
      ];
      jest.spyOn(receiptRepository, 'findByIds').mockResolvedValue(mockReceipts as any);
      jest.spyOn(service, 'filterAccessibleSplits').mockResolvedValue(['split-1', 'split-2']);

      const result = await service.filterAccessibleReceipts(mockUserId, ['receipt-1', 'receipt-2', 'receipt-3']);
      expect(result).toEqual(['receipt-1', 'receipt-2']);
    });
  });

  describe('filterAccessibleDisputes', () => {
    it('should filter disputes accessible to user', async () => {
      const mockDisputes = [
        { id: 'dispute-1', splitId: 'split-1' },
        { id: 'dispute-2', splitId: 'split-2' },
        { id: 'dispute-3', splitId: 'split-3' },
      ];
      jest.spyOn(disputeRepository, 'findByIds').mockResolvedValue(mockDisputes as any);
      jest.spyOn(service, 'filterAccessibleSplits').mockResolvedValue(['split-1', 'split-2']);

      const result = await service.filterAccessibleDisputes(mockUserId, ['dispute-1', 'dispute-2', 'dispute-3']);
      expect(result).toEqual(['dispute-1', 'dispute-2']);
    });
  });
});
