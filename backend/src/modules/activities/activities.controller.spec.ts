import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityType } from '../../entities/activity.entity';

describe('ActivitiesController', () => {
    let controller: ActivitiesController;
    let service: jest.Mocked<ActivitiesService>;

    const mockActivity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'GABC123',
        activityType: ActivityType.SPLIT_CREATED,
        splitId: '123e4567-e89b-12d3-a456-426614174001',
        metadata: { amount: 100 },
        isRead: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    const mockPaginatedResponse = {
        data: [mockActivity],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
        unreadCount: 0,
    };

    beforeEach(async () => {
        const mockService = {
            createActivity: jest.fn(),
            getActivities: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            getUnreadCount: jest.fn(),
            deleteActivity: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ActivitiesController],
            providers: [
                {
                    provide: ActivitiesService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<ActivitiesController>(ActivitiesController);
        service = module.get(ActivitiesService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createActivity', () => {
        it('should create an activity', async () => {
            const createDto = {
                userId: 'GABC123',
                activityType: ActivityType.SPLIT_CREATED,
                splitId: '123e4567-e89b-12d3-a456-426614174001',
                metadata: { amount: 100 },
            };

            service.createActivity.mockResolvedValue(mockActivity);

            const result = await controller.createActivity(createDto);

            expect(service.createActivity).toHaveBeenCalledWith(createDto);
            expect(result).toEqual(mockActivity);
        });
    });

    describe('getActivities', () => {
        it('should get activities for a user', async () => {
            const userId = 'GABC123';
            const query = { page: 1, limit: 20 };

            service.getActivities.mockResolvedValue(mockPaginatedResponse);

            const result = await controller.getActivities(userId, query);

            expect(service.getActivities).toHaveBeenCalledWith({
                userId,
                ...query,
            });
            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should get activities with filters', async () => {
            const userId = 'GABC123';
            const query = {
                page: 1,
                limit: 20,
                activityType: ActivityType.PAYMENT_MADE,
                isRead: false,
            };

            service.getActivities.mockResolvedValue(mockPaginatedResponse);

            await controller.getActivities(userId, query);

            expect(service.getActivities).toHaveBeenCalledWith({
                userId,
                ...query,
            });
        });
    });

    describe('markAsRead', () => {
        it('should mark activities as read', async () => {
            const userId = 'GABC123';
            const markAsReadDto = { activityIds: ['id1', 'id2'] };

            service.markAsRead.mockResolvedValue({ updated: 2 });

            const result = await controller.markAsRead(userId, markAsReadDto);

            expect(service.markAsRead).toHaveBeenCalledWith(userId, markAsReadDto);
            expect(result).toEqual({ updated: 2 });
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all activities as read', async () => {
            const userId = 'GABC123';

            service.markAllAsRead.mockResolvedValue({ updated: 5 });

            const result = await controller.markAllAsRead(userId);

            expect(service.markAllAsRead).toHaveBeenCalledWith(userId);
            expect(result).toEqual({ updated: 5 });
        });
    });

    describe('getUnreadCount', () => {
        it('should get unread count', async () => {
            const userId = 'GABC123';

            service.getUnreadCount.mockResolvedValue({ count: 7 });

            const result = await controller.getUnreadCount(userId);

            expect(service.getUnreadCount).toHaveBeenCalledWith(userId);
            expect(result).toEqual({ count: 7 });
        });
    });

    describe('deleteActivity', () => {
        it('should delete an activity', async () => {
            const userId = 'GABC123';
            const activityId = '123e4567-e89b-12d3-a456-426614174000';

            service.deleteActivity.mockResolvedValue(undefined);

            await controller.deleteActivity(userId, activityId);

            expect(service.deleteActivity).toHaveBeenCalledWith(activityId, userId);
        });
    });
});
