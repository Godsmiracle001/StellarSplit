import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../../entities/activity.entity';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { PaymentGateway } from '../../websocket/payment.gateway';

/**
 * Module for activity feed functionality
 * Provides services for tracking and managing user activities:
 * - Split created
 * - Participant added
 * - Payment made/received
 * - Split completed
 * - Reminder sent
 * - Split edited
 */
@Module({
    imports: [TypeOrmModule.forFeature([Activity])],
    controllers: [ActivitiesController],
    providers: [ActivitiesService, PaymentGateway],
    exports: [ActivitiesService],
})
export class ActivitiesModule { }
