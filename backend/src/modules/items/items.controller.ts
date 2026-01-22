import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from '../../entities/item.entity';

@ApiTags('items')
@Controller('items')
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new item' })
    @ApiResponse({ status: 201, description: 'The item has been successfully created.', type: Item })
    create(@Body() createItemDto: CreateItemDto) {
        return this.itemsService.create(createItemDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all items for a split' })
    @ApiResponse({ status: 200, description: 'Return all items.', type: [Item] })
    findAll(@Query('splitId') splitId: string) {
        return this.itemsService.findAllBySplitId(splitId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single item' })
    @ApiResponse({ status: 200, description: 'Return the item.', type: Item })
    findOne(@Param('id') id: string) {
        return this.itemsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an item' })
    @ApiResponse({ status: 200, description: 'The item has been successfully updated.', type: Item })
    update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
        return this.itemsService.update(id, updateItemDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an item' })
    @ApiResponse({ status: 200, description: 'The item has been successfully deleted.' })
    remove(@Param('id') id: string) {
        return this.itemsService.remove(id);
    }
}
