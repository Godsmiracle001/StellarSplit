import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { CreateParticipantDto } from '../splits/dto/split.dto';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
  ) {}

  async createParticipant(createParticipantDto: CreateParticipantDto): Promise<Participant> {
    const participant = this.participantRepository.create(createParticipantDto);
    return await this.participantRepository.save(participant);
  }

  async findBySplitId(splitId: string): Promise<Participant[]> {
    return await this.participantRepository.find({
      where: { splitId },
    });
  }

  async findByUserId(userId: string): Promise<Participant[]> {
    return await this.participantRepository.find({
      where: { userId },
    });
  }

  async updateParticipant(id: string, updateData: Partial<Participant>): Promise<Participant> {
    const participant = await this.participantRepository.findOne({ where: { id } });
    if (!participant) {
      throw new NotFoundException(`Participant ${id} not found`);
    }
    Object.assign(participant, updateData);
    return await this.participantRepository.save(participant);
  }

  async removeParticipant(id: string): Promise<void> {
    const participant = await this.participantRepository.findOne({ where: { id } });
    if (!participant) {
      throw new NotFoundException(`Participant ${id} not found`);
    }
    await this.participantRepository.remove(participant);
  }
}
