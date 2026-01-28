import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { Activity, ActivityType } from '../../entities/activity.entity';
import { WebSocketGateway } from '../../websocket/payment.gateway';

describe('ActivitiesService', () => {
    let service: ActivitiesService;
    let repository: jest.Mocked<Repository<Activity>>;
    let websocketGateway: jest.Mocked<WebSocketGateway>;

    const mockActivity: Activity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'GABC123',
        activityType: ActivityType.SPLIT_CREATED,
        splitId: '123e4567-e89b-12d3-a456-426614174001',
        metadata: { amount: 100 },
        isRead: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    beforeEach(async () => {
        const mockRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };

        const mockWebsocketGateway = {
            sendActivityUpdate: jest.fn(),
            sendActivityReadUpdate: jest.fn(),
            sendActivityReadAllUpdate: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivitiesService,
                {
                    provide: getRepositoryToken(Activity),
                    useValue: mockRepository,
                },
                {
                    provide: WebSocketGateway,
                    useValue: mockWebsocketGateway,
                },
            ],
        }).compile();

        service = module.get<ActivitiesService>(ActivitiesService);
        repository = module.get(getRepositoryToken(Activity));
        websocketGateway = module.get(WebSocketGateway);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createActivity', () => {
        it('should create and save an activity', async () => {
            const createDto = {
                userId: 'GABC123',
                activityType: ActivityType.SPLIT_CREATED,
                splitId: '123e4567-e89b-12d3-a456-426614174001',
                metadata: { amount: 100 },
            };

            repository.create.mockReturnValue(mockActivity as any);
            repository.save.mockResolvedValue(mockActivity);

            const result = await service.createActivity(createDto);

            expect(repository.create).toHaveBeenCalledWith({
                userId: createDto.userId,
                activityType: createDto.activityType,
                splitId: createDto.splitId,
                metadata: createDto.metadata,
                isRead: false,
            });
            expect(repository.save).toHaveBeenCalledWith(mockActivity);
            expect(websocketGateway.sendActivityUpdate).toHaveBeenCalledWith(
                createDto.userId,
                mockActivity
            );
            expect(result).toEqual(mockActivity);
        });

        it('should create activity with empty metadata if not provided', async () => {
            const createDto = {
                userId: 'GABC123',
                activityType: ActivityType.PAYMENT_MADE,
            };

            repository.create.mockReturnValue(mockActivity as any);
            repository.save.mockResolvedValue(mockActivity);

            await service.createActivity(createDto);

            expect(repository.create).toHaveBeenCalledWith({
                userId: createDto.userId,
                activityType: createDto.activityType,
                splitId: undefined,
                metadata: {},
                isRead: false,
            });
        });
    });

    describe('getActivities', () => {
        it('should return paginated activities', async () => {
            const getDto = {
                userId: 'GABC123',
                page: 1,
                limit: 20,
            };

            const mockActivities = [mockActivity];
            repository.findAndCount.mockResolvedValue([mockActivities, 1]);
            repository.count.mockResolvedValue(0);

            const result = await service.getActivities(getDto);

            expect(repository.findAndCount).toHaveBeenCalledWith({
                where: { userId: getDto.userId },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: 20,
            });
            expect(result).toEqual({
                data: mockActivities,
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
                hasMore: false,
                unreadCount: 0,
            });
        });

        it('should filter by activity type', async () => {
            const getDto = {
                userId: 'GABC123',
                page: 1,
                limit: 20,
                activityType: ActivityType.PAYMENT_MADE,
            };

            repository.findAndCount.mockResolvedValue([[], 0]);
            repository.count.mockResolvedValue(0);

            await service.getActivities(getDto);

            expect(repository.findAndCount).toHaveBeenCalledWith({
                where: {
                    userId: getDto.userId,
                    activityType: ActivityType.PAYMENT_MADE,
                },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: 20,
            });
        });

        it('should filter by split ID and read status', async () => {
            const getDto = {
                userId: 'GABC123',
                page: 1,
                limit: 20,
                splitId: '123e4567-e89b-12d3-a456-426614174001',
                isRead: false,
            };

            repository.findAndCount.mockResolvedValue([[], 0]);
            repository.count.mockResolvedValue(5);

            await service.getActivities(getDto);

            expect(repository.findAndCount).toHaveBeenCalledWith({
                where: {
                    userId: getDto.userId,
                    splitId: getDto.splitId,
                    isRead: false,
                },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: 20,
            });
        });

        it('should calculate pagination correctly', async () => {
            const getDto = {
                userId: 'GABC123',
                page: 2,
                limit: 10,
            };

            repository.findAndCount.mockResolvedValue([[], 25]);
            repository.count.mockResolvedValue(5);

            const result = await service.getActivities(getDto);

            expect(result.totalPages).toBe(3);
            expect(result.hasMore).toBe(true);
            expect(repository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10,
                    take: 10,
                })
            );
        });
    });

    describe('markAsRead', () => {
        it('should mark activities as read', async () => {
            const userId = 'GABC123';
            const activityIds = ['id1', 'id2'];
            const markAsReadDto = { activityIds };

            const mockActivities = [
                { ...mockActivity, id: 'id1' },
                { ...mockActivity, id: 'id2' },
            ];

            repository.find.mockResolvedValue(mockActivities);
            repository.update.mockResolvedValue({ affected: 2 } as any);

            const result = await service.markAsRead(userId, markAsReadDto);

            expect(repository.find).toHaveBeenCalled();
            expect(repository.update).toHaveBeenCalledWith(
                {
                    id: expect.anything(),
                    userId,
                },
                { isRead: true }
            );
            expect(websocketGateway.sendActivityReadUpdate).toHaveBeenCalledWith(
                userId,
                activityIds
            );
            expect(result.updated).toBe(2);
        });

        it('should throw NotFoundException if activities not found', async () => {
            const userId = 'GABC123';
            const activityIds = ['id1', 'id2', 'id3'];
            const markAsReadDto = { activityIds };

            // Only 2 activities found instead of 3
            repository.find.mockResolvedValue([mockActivity, mockActivity]);

            await expect(service.markAsRead(userId, markAsReadDto)).rejects.toThrow(
                NotFoundException
            );
        });

        it('should throw NotFoundException if no activities found', async () => {
            const userId = 'GABC123';
            const activityIds = ['id1'];
            const markAsReadDto = { activityIds };

            repository.find.mockResolvedValue([]);

            await expect(service.markAsRead(userId, markAsReadDto)).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all unread activities as read', async () => {
            const userId = 'GABC123';

            repository.update.mockResolvedValue({ affected: 5 } as any);

            const result = await service.markAllAsRead(userId);

            expect(repository.update).toHaveBeenCalledWith(
                { userId, isRead: false },
                { isRead: true }
            );
            expect(websocketGateway.sendActivityReadAllUpdate).toHaveBeenCalledWith(userId);
            expect(result.updated).toBe(5);
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread count', async () => {
            const userId = 'GABC123';

            repository.count.mockResolvedValue(7);

            const result = await service.getUnreadCount(userId);

            expect(repository.count).toHaveBeenCalledWith({
                where: { userId, isRead: false },
            });
            expect(result.count).toBe(7);
        });
    });

    describe('deleteActivity', () => {
        it('should delete an activity', async () => {
            const activityId = '123e4567-e89b-12d3-a456-426614174000';
            const userId = 'GABC123';

            repository.findOne.mockResolvedValue(mockActivity);
            repository.remove.mockResolvedValue(mockActivity);

            await service.deleteActivity(activityId, userId);

            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: activityId, userId },
            });
            expect(repository.remove).toHaveBeenCalledWith(mockActivity);
        });

        it('should throw NotFoundException if activity not found', async () => {
            const activityId = 'nonexistent';
            const userId = 'GABC123';

            repository.findOne.mockResolvedValue(null);

            await expect(service.deleteActivity(activityId, userId)).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('Event Tracking Methods', () => {
        beforeEach(() => {
            repository.create.mockReturnValue(mockActivity as any);
            repository.save.mockResolvedValue(mockActivity);
        });

        it('should track split created event', async () => {
            await service.trackSplitCreated('GABC123', 'split123', { total: 100 });

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'GABC123',
                    activityType: ActivityType.SPLIT_CREATED,
                    splitId: 'split123',
                    metadata: expect.objectContaining({ total: 100 }),
                })
            );
        });

        it('should track participant added event', async () => {
            await service.trackParticipantAdded('GABC123', 'split123', 'GDEF456');

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'GABC123',
                    activityType: ActivityType.PARTICIPANT_ADDED,
                    splitId: 'split123',
                    metadata: expect.objectContaining({ participantAddress: 'GDEF456' }),
                })
            );
        });

        it('should track payment made event', async () => {
            await service.trackPaymentMade('GABC123', 'split123', 50, 'txhash123');

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'GABC123',
                    activityType: ActivityType.PAYMENT_MADE,
                    splitId: 'split123',
                    metadata: expect.objectContaining({
                        amount: 50,
                        txHash: 'txhash123',
                    }),
                })
            );
        });

        it('should track payment received event', async () => {
            await service.trackPaymentReceived(
                'GABC123',
                'split123',
                50,
                'txhash123',
                'GDEF456'
            );

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'GABC123',
                    activityType: ActivityType.PAYMENT_RECEIVED,
                    splitId: 'split123',
                    metadata: expect.objectContaining({
                        amount: 50,
                        txHash: 'txhash123',
                        fromAddress: 'GDEF456',
                    }),
                })
            );
        });

        it('should track split completed event', async () => {
            await service.trackSplitCompleted('GABC123', 'split123');

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'GABC123',
                    activityType: ActivityType.SPLIT_COMPLETED,
                    splitId: 'split123',
                })
            );
        });

        it('should track reminder sent event', async () => {
            await service.trackReminderSent('GABC123', 'split123', 'GDEF456');

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'GABC123',
                    activityType: ActivityType.REMINDER_SENT,
                    splitId: 'split123',
                    metadata: expect.objectContaining({ recipientAddress: 'GDEF456' }),
                })
            );
        });

        it('should track split edited event', async () => {
            const changes = { totalAmount: 150, description: 'Updated' };
            await service.trackSplitEdited('GABC123', 'split123', changes);

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'GABC123',
                    activityType: ActivityType.SPLIT_EDITED,
                    splitId: 'split123',
                    metadata: expect.objectContaining({ changes }),
                })
            );
        });
    });
});
