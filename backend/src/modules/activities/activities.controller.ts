import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ActivitiesService, PaginatedActivitiesResponse } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { GetActivitiesDto } from './dto/get-activities.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { Activity } from '../../entities/activity.entity';

@ApiTags('Activities')
@Controller('activities')
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new activity (internal use)' })
    @ApiResponse({ status: 201, description: 'Activity created successfully', type: Activity })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    async createActivity(@Body() createActivityDto: CreateActivityDto): Promise<Activity> {
        return this.activitiesService.createActivity(createActivityDto);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get paginated activities for a user' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Invalid parameters' })
    async getActivities(
        @Param('userId') userId: string,
        @Query() query: Omit<GetActivitiesDto, 'userId'>,
    ): Promise<PaginatedActivitiesResponse> {
        return this.activitiesService.getActivities({
            userId,
            ...query,
        });
    }

    @Patch(':userId/mark-read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark specific activities as read' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiResponse({ status: 200, description: 'Activities marked as read successfully' })
    @ApiResponse({ status: 404, description: 'Some activities not found' })
    async markAsRead(
        @Param('userId') userId: string,
        @Body() markAsReadDto: MarkAsReadDto,
    ): Promise<{ updated: number }> {
        return this.activitiesService.markAsRead(userId, markAsReadDto);
    }

    @Patch(':userId/mark-all-read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark all activities as read for a user' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiResponse({ status: 200, description: 'All activities marked as read successfully' })
    async markAllAsRead(@Param('userId') userId: string): Promise<{ updated: number }> {
        return this.activitiesService.markAllAsRead(userId);
    }

    @Get(':userId/unread-count')
    @ApiOperation({ summary: 'Get unread count for a user' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
    async getUnreadCount(@Param('userId') userId: string): Promise<{ count: number }> {
        return this.activitiesService.getUnreadCount(userId);
    }

    @Delete(':userId/:activityId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an activity' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiParam({ name: 'activityId', description: 'ID of the activity to delete' })
    @ApiResponse({ status: 204, description: 'Activity deleted successfully' })
    @ApiResponse({ status: 404, description: 'Activity not found' })
    async deleteActivity(
        @Param('userId') userId: string,
        @Param('activityId') activityId: string,
    ): Promise<void> {
        return this.activitiesService.deleteActivity(activityId, userId);
    }
}
