import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemsService } from './items.service';
import { Item } from '../../entities/item.entity';
import { NotFoundException } from '@nestjs/common';

describe('ItemsService', () => {
    let service: ItemsService;
    let repository: Repository<Item>;

    const mockItem = {
        id: 'item-uuid',
        splitId: 'split-uuid',
        name: 'Burger',
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10,
        assignedToIds: ['user-uuid'],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockItemRepository = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((item) => Promise.resolve({ id: 'uuid', ...item })),
        find: jest.fn().mockResolvedValue([mockItem]),
        findOne: jest.fn().mockResolvedValue(mockItem),
        remove: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ItemsService,
                {
                    provide: getRepositoryToken(Item),
                    useValue: mockItemRepository,
                },
            ],
        }).compile();

        service = module.get<ItemsService>(ItemsService);
        repository = module.get<Repository<Item>>(getRepositoryToken(Item));

        // Reset findOne mock to return mockItem by default
        mockItemRepository.findOne.mockResolvedValue(mockItem);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create and save an item', async () => {
            const dto = {
                splitId: 'split-uuid',
                name: 'Burger',
                quantity: 1,
                unitPrice: 10,
                totalPrice: 10,
                assignedToIds: ['user-uuid'],
            };

            const result = await service.create(dto);
            expect(result).toEqual({ id: 'uuid', ...dto });
            expect(repository.create).toHaveBeenCalledWith(dto);
            expect(repository.save).toHaveBeenCalled();
        });
    });

    describe('findAllBySplitId', () => {
        it('should return an array of items', async () => {
            const result = await service.findAllBySplitId('split-uuid');
            expect(result).toEqual([mockItem]);
            expect(repository.find).toHaveBeenCalledWith({ where: { splitId: 'split-uuid' } });
        });
    });

    describe('findOne', () => {
        it('should return a single item', async () => {
            const result = await service.findOne('item-uuid');
            expect(result).toEqual(mockItem);
            expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'item-uuid' } });
        });

        it('should throw NotFoundException if item not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update an item', async () => {
            const updateDto = { name: 'Cheese Burger' };
            const result = await service.update('item-uuid', updateDto);
            expect(result.id).toBe('item-uuid');
            expect(repository.save).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should remove an item', async () => {
            await service.remove('item-uuid');
            expect(repository.remove).toHaveBeenCalled();
        });
    });
});
