import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../../entities/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
    constructor(
        @InjectRepository(Item)
        private readonly itemRepository: Repository<Item>,
    ) { }

    async create(createItemDto: CreateItemDto): Promise<Item> {
        const item = this.itemRepository.create(createItemDto);
        return await this.itemRepository.save(item);
    }

    async findAllBySplitId(splitId: string): Promise<Item[]> {
        return await this.itemRepository.find({
            where: { splitId },
        });
    }

    async findOne(id: string): Promise<Item> {
        const item = await this.itemRepository.findOne({
            where: { id },
        });
        if (!item) {
            throw new NotFoundException(`Item with ID ${id} not found`);
        }
        return item;
    }

    async update(id: string, updateItemDto: UpdateItemDto): Promise<Item> {
        const item = await this.findOne(id);
        Object.assign(item, updateItemDto);
        return await this.itemRepository.save(item);
    }

    async remove(id: string): Promise<void> {
        const item = await this.findOne(id);
        await this.itemRepository.remove(item);
    }
}
