import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Activity, ActivityType } from '../../entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { GetActivitiesDto } from './dto/get-activities.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { WebSocketGateway } from '../../websocket/payment.gateway';

export interface PaginatedActivitiesResponse {
    data: Activity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    unreadCount: number;
}

@Injectable()
export class ActivitiesService {
    constructor(
        @InjectRepository(Activity)
        private readonly activityRepository: Repository<Activity>,
        private readonly websocketGateway: WebSocketGateway,
    ) { }

    /**
     * Create a new activity and broadcast it via WebSocket
     */
    async createActivity(createActivityDto: CreateActivityDto): Promise<Activity> {
        const activity = this.activityRepository.create({
            userId: createActivityDto.userId,
            activityType: createActivityDto.activityType,
            splitId: createActivityDto.splitId,
            metadata: createActivityDto.metadata || {},
            isRead: false,
        });

        const savedActivity = await this.activityRepository.save(activity);

        // Broadcast the new activity to the user via WebSocket
        this.websocketGateway.sendActivityUpdate(createActivityDto.userId, savedActivity);

        return savedActivity;
    }

    /**
     * Get paginated activities for a user with optional filters
     */
    async getActivities(getActivitiesDto: GetActivitiesDto): Promise<PaginatedActivitiesResponse> {
        const { userId, page = 1, limit = 20, activityType, splitId, isRead } = getActivitiesDto;

        // Build the where clause dynamically
        const where: FindOptionsWhere<Activity> = { userId };

        if (activityType !== undefined) {
            where.activityType = activityType;
        }

        if (splitId !== undefined) {
            where.splitId = splitId;
        }

        if (isRead !== undefined) {
            where.isRead = isRead;
        }

        // Get total count for pagination
        const [data, total] = await this.activityRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        // Get unread count
        const unreadCount = await this.activityRepository.count({
            where: { userId, isRead: false },
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            total,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages,
            unreadCount,
        };
    }

    /**
     * Mark multiple activities as read
     */
    async markAsRead(userId: string, markAsReadDto: MarkAsReadDto): Promise<{ updated: number }> {
        const { activityIds } = markAsReadDto;

        // Verify all activities belong to the user before updating
        const activities = await this.activityRepository.find({
            where: {
                id: In(activityIds),
                userId,
            },
        });

        if (activities.length !== activityIds.length) {
            throw new NotFoundException('Some activities were not found or do not belong to the user');
        }

        // Update the activities
        const result = await this.activityRepository.update(
            {
                id: In(activityIds),
                userId,
            },
            { isRead: true }
        );

        // Broadcast the update via WebSocket
        this.websocketGateway.sendActivityReadUpdate(userId, activityIds);

        return { updated: result.affected || 0 };
    }

    /**
     * Mark all activities as read for a user
     */
    async markAllAsRead(userId: string): Promise<{ updated: number }> {
        const result = await this.activityRepository.update(
            { userId, isRead: false },
            { isRead: true }
        );

        // Broadcast the update via WebSocket
        this.websocketGateway.sendActivityReadAllUpdate(userId);

        return { updated: result.affected || 0 };
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string): Promise<{ count: number }> {
        const count = await this.activityRepository.count({
            where: { userId, isRead: false },
        });

        return { count };
    }

    /**
     * Delete an activity (admin only or cleanup)
     */
    async deleteActivity(id: string, userId: string): Promise<void> {
        const activity = await this.activityRepository.findOne({
            where: { id, userId },
        });

        if (!activity) {
            throw new NotFoundException('Activity not found');
        }

        await this.activityRepository.remove(activity);
    }

    // ============ Event Tracking Methods ============

    /**
     * Track split created event
     */
    async trackSplitCreated(userId: string, splitId: string, metadata: Record<string, any> = {}): Promise<void> {
        await this.createActivity({
            userId,
            activityType: ActivityType.SPLIT_CREATED,
            splitId,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track participant added event
     */
    async trackParticipantAdded(userId: string, splitId: string, participantAddress: string, metadata: Record<string, any> = {}): Promise<void> {
        await this.createActivity({
            userId,
            activityType: ActivityType.PARTICIPANT_ADDED,
            splitId,
            metadata: {
                participantAddress,
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track payment made event
     */
    async trackPaymentMade(userId: string, splitId: string, amount: number, txHash: string, metadata: Record<string, any> = {}): Promise<void> {
        await this.createActivity({
            userId,
            activityType: ActivityType.PAYMENT_MADE,
            splitId,
            metadata: {
                amount,
                txHash,
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track payment received event
     */
    async trackPaymentReceived(userId: string, splitId: string, amount: number, txHash: string, fromAddress: string, metadata: Record<string, any> = {}): Promise<void> {
        await this.createActivity({
            userId,
            activityType: ActivityType.PAYMENT_RECEIVED,
            splitId,
            metadata: {
                amount,
                txHash,
                fromAddress,
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track split completed event
     */
    async trackSplitCompleted(userId: string, splitId: string, metadata: Record<string, any> = {}): Promise<void> {
        await this.createActivity({
            userId,
            activityType: ActivityType.SPLIT_COMPLETED,
            splitId,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track reminder sent event
     */
    async trackReminderSent(userId: string, splitId: string, recipientAddress: string, metadata: Record<string, any> = {}): Promise<void> {
        await this.createActivity({
            userId,
            activityType: ActivityType.REMINDER_SENT,
            splitId,
            metadata: {
                recipientAddress,
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track split edited event
     */
    async trackSplitEdited(userId: string, splitId: string, changes: Record<string, any>, metadata: Record<string, any> = {}): Promise<void> {
        await this.createActivity({
            userId,
            activityType: ActivityType.SPLIT_EDITED,
            splitId,
            metadata: {
                changes,
                ...metadata,
                timestamp: new Date().toISOString(),
            },
        });
    }
}
