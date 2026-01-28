
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupActivity } from './entities/group-activity.entity';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupActivity])],
  providers: [GroupService],
  controllers: [GroupController],
})
export class GroupModule {}
