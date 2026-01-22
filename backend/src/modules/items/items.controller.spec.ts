import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

describe('ItemsController', () => {
    let controller: ItemsController;
    let service: ItemsService;

    const mockItem = {
        id: 'item-uuid',
        splitId: 'split-uuid',
        name: 'Burger',
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10,
        assignedToIds: ['user-uuid'],
    };

    const mockItemsService = {
        create: jest.fn().mockResolvedValue(mockItem),
        findAllBySplitId: jest.fn().mockResolvedValue([mockItem]),
        findOne: jest.fn().mockResolvedValue(mockItem),
        update: jest.fn().mockResolvedValue(mockItem),
        remove: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ItemsController],
            providers: [
                {
                    provide: ItemsService,
                    useValue: mockItemsService,
                },
            ],
        }).compile();

        controller = module.get<ItemsController>(ItemsController);
        service = module.get<ItemsService>(ItemsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create an item', async () => {
            const dto: CreateItemDto = {
                splitId: 'split-uuid',
                name: 'Burger',
                quantity: 1,
                unitPrice: 10,
                totalPrice: 10,
                assignedToIds: ['user-uuid'],
            };
            const result = await controller.create(dto);
            expect(result).toEqual(mockItem);
            expect(service.create).toHaveBeenCalledWith(dto);
        });
    });

    describe('findAll', () => {
        it('should return all items for a split', async () => {
            const result = await controller.findAll('split-uuid');
            expect(result).toEqual([mockItem]);
            expect(service.findAllBySplitId).toHaveBeenCalledWith('split-uuid');
        });
    });

    describe('findOne', () => {
        it('should return a single item', async () => {
            const result = await controller.findOne('item-uuid');
            expect(result).toEqual(mockItem);
            expect(service.findOne).toHaveBeenCalledWith('item-uuid');
        });
    });

    describe('update', () => {
        it('should update an item', async () => {
            const dto: UpdateItemDto = { name: 'Cheese Burger' };
            const result = await controller.update('item-uuid', dto);
            expect(result).toEqual(mockItem);
            expect(service.update).toHaveBeenCalledWith('item-uuid', dto);
        });
    });

    describe('remove', () => {
        it('should remove an item', async () => {
            await controller.remove('item-uuid');
            expect(service.remove).toHaveBeenCalledWith('item-uuid');
        });
    });
});
