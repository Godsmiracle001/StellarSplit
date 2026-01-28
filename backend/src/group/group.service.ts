
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, SplitType } from './entities/group.entity';
import { GroupActivity } from './entities/group-activity.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,

    @InjectRepository(GroupActivity)
    private activityRepo: Repository<GroupActivity>,
  ) {}

  async createGroup(data: Partial<Group>, creatorWallet: string) {
    const group = this.groupRepo.create({
      ...data,
      creatorId: creatorWallet,
      members: [{ wallet: creatorWallet, role: 'admin' }],
    });

    await this.groupRepo.save(group);

    await this.log(group.id, creatorWallet, 'CREATE_GROUP');

    return group;
  }

  async addMember(groupId: string, wallet: string, actor: string) {
    const group = await this.groupRepo.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Group not found');

    this.assertAdmin(group, actor);

    if (group.members.some(m => m.wallet === wallet)) return group;

    group.members.push({ wallet, role: 'member' });

    await this.groupRepo.save(group);
    await this.log(groupId, actor, 'ADD_MEMBER', { wallet });

    return group;
  }

  async removeMember(groupId: string, wallet: string, actor: string) {
    const group = await this.groupRepo.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Group not found');

    this.assertAdmin(group, actor);

    group.members = group.members.filter(m => m.wallet !== wallet);

    await this.groupRepo.save(group);
    await this.log(groupId, actor, 'REMOVE_MEMBER', { wallet });

    return group;
  }

  async createSplitFromGroup(groupId: string, actor: string) {
    const group = await this.groupRepo.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Group not found');

    this.assertMember(group, actor);

    const participants = group.members.map(m => m.wallet);

    await this.log(groupId, actor, 'CREATE_SPLIT', {
      participants,
      splitType: group.defaultSplitType,
    });

    return {
      participants,
      splitType: group.defaultSplitType,
    };
  }

  async getActivity(groupId: string) {
    return this.activityRepo.find({
      where: { groupId },
      order: { createdAt: 'DESC' },
    });
  }

  private assertAdmin(group: Group, wallet: string) {
    const member = group.members.find(m => m.wallet === wallet);
    if (!member || member.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  private assertMember(group: Group, wallet: string) {
    if (!group.members.some(m => m.wallet === wallet)) {
      throw new ForbiddenException('Not a group member');
    }
  }

  private async log(
    groupId: string,
    actor: string,
    action: string,
    metadata?: any,
  ) {
    await this.activityRepo.save({
      groupId,
      actor,
      action,
      metadata,
    });
  }
}
