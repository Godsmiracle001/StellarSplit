import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dispute } from "../../entities/dispute.entity";
import { Participant } from "../../entities/participant.entity";
import { Split } from "../../entities/split.entity";
import { Group } from "../../group/entities/group.entity";
import { Receipt } from "../../receipts/entities/receipt.entity";

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(Split)
    private splitRepository: Repository<Split>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    @InjectRepository(Dispute)
    private disputeRepository: Repository<Dispute>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  // Split authorization methods
  async canAccessSplit(userId: string, splitId: string): Promise<boolean> {
    const split = await this.splitRepository.findOne({
      where: { id: splitId },
      relations: ["participants"],
    });

    if (!split) {
      return false;
    }

    // Check if user is a participant or creator
    return (
      split.participants.some((p: Participant) => p.userId === userId) ||
      split.creatorWalletAddress === userId
    );
  }

  async canCreatePayment(userId: string, splitId: string): Promise<boolean> {
    // Users can create payments for splits they participate in
    return this.canAccessSplit(userId, splitId);
  }

  async canAddParticipant(userId: string, splitId: string): Promise<boolean> {
    // Only split creator can add participants (or participants can invite others)
    const split = await this.splitRepository.findOne({
      where: { id: splitId },
    });

    return (
      split?.creatorWalletAddress === userId ||
      (await this.canAccessSplit(userId, splitId))
    );
  }

  async canRemoveParticipant(
    userId: string,
    splitId: string,
  ): Promise<boolean> {
    // Only split creator can remove participants
    const split = await this.splitRepository.findOne({
      where: { id: splitId },
    });

    return split?.creatorWalletAddress === userId;
  }

  async canCreatePaymentForParticipant(
    userId: string,
    splitId: string,
    participantId: string,
  ): Promise<boolean> {
    // Users can only create payments for themselves or if they're the split creator
    if (!(await this.canAccessSplit(userId, splitId))) {
      return false;
    }

    const participant = await this.participantRepository.findOne({
      where: { id: participantId, splitId },
    });

    if (!participant) {
      return false;
    }

    // User can create payment for themselves or if they're the creator
    return (
      participant.userId === userId ||
      (await this.isSplitCreator(userId, splitId))
    );
  }

  async canAccessParticipantPayments(
    userId: string,
    participantId: string,
  ): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
      relations: ["split"],
    });

    if (!participant) {
      return false;
    }

    // User can access their own payments or if they can access the split
    return (
      participant.userId === userId ||
      (await this.canAccessSplit(userId, participant.splitId))
    );
  }

  // Receipt authorization methods
  async canAccessReceipt(userId: string, receiptId: string): Promise<boolean> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId },
      relations: ["split"],
    });

    if (!receipt) {
      return false;
    }

    return this.canAccessSplit(userId, receipt.splitId);
  }

  // Dispute authorization methods
  async canAccessDispute(userId: string, disputeId: string): Promise<boolean> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      return false;
    }

    // Users can access disputes for splits they participate in
    return this.canAccessSplit(userId, dispute.splitId);
  }

  async isAdmin(userId: string): Promise<boolean> {
    // TODO: Implement admin check based on user roles
    // For now, return false - no admin functionality
    return false;
  }

  // Group authorization methods
  async canAccessGroup(userId: string, groupId: string): Promise<boolean> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      return false;
    }

    // Check if user is creator or member
    return (
      group.creatorId === userId ||
      group.members.some((member: any) => member.wallet === userId)
    );
  }

  async canManageGroupMembers(
    userId: string,
    groupId: string,
  ): Promise<boolean> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      return false;
    }

    // Only creator and admins can manage members
    return (
      group.creatorId === userId ||
      group.members.some(
        (member: any) => member.wallet === userId && member.role === "admin",
      )
    );
  }

  async canCreateGroupSplit(userId: string, groupId: string): Promise<boolean> {
    // Any group member can create splits
    return this.canAccessGroup(userId, groupId);
  }

  // Helper methods
  private async isSplitCreator(
    userId: string,
    splitId: string,
  ): Promise<boolean> {
    const split = await this.splitRepository.findOne({
      where: { id: splitId },
    });

    return split?.creatorWalletAddress === userId;
  }

  // Batch authorization for multiple resources
  async filterAccessibleSplits(
    userId: string,
    splitIds: string[],
  ): Promise<string[]> {
    const splits = await this.splitRepository.findByIds(splitIds);

    return splits
      .filter(
        (split: Split) =>
          split.participants.some((p: Participant) => p.userId === userId) ||
          split.creatorWalletAddress === userId,
      )
      .map((split: Split) => split.id);
  }

  async filterAccessibleReceipts(
    userId: string,
    receiptIds: string[],
  ): Promise<string[]> {
    const receipts = await this.receiptRepository.findByIds(receiptIds);

    const accessibleSplitIds = await this.filterAccessibleSplits(
      userId,
      receipts.map((r) => r.splitId),
    );

    return receipts
      .filter((receipt: Receipt) =>
        accessibleSplitIds.includes(receipt.splitId),
      )
      .map((receipt: Receipt) => receipt.id);
  }

  async filterAccessibleDisputes(
    userId: string,
    disputeIds: string[],
  ): Promise<string[]> {
    const disputes = await this.disputeRepository.findByIds(disputeIds);

    const accessibleSplitIds = await this.filterAccessibleSplits(
      userId,
      disputes.map((d) => d.splitId),
    );

    return disputes
      .filter((dispute: Dispute) =>
        accessibleSplitIds.includes(dispute.splitId),
      )
      .map((dispute: Dispute) => dispute.id);
  }
}
