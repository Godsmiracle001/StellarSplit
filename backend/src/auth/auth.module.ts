import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationService } from './services/authorization.service';
import { AuthorizationGuard } from './guards/authorization.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Split } from '../entities/split.entity';
import { Participant } from '../entities/participant.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Dispute } from '../entities/dispute.entity';
import { Group } from '../group/entities/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Split,
      Participant,
      Receipt,
      Dispute,
      Group,
    ]),
  ],
  providers: [
    AuthorizationService,
    AuthorizationGuard,
    JwtAuthGuard,
  ],
  exports: [
    AuthorizationService,
    AuthorizationGuard,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
