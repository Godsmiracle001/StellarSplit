import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActivitiesService, PaginatedActivitiesResponse } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { GetActivitiesDto } from './dto/get-activities.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { Activity, ActivityType } from '../../entities/activity.entity';
import { PaginatedActivitiesResponseDto } from './dto/activity-response.dto';
import { ApiErrorResponseDto, CountResponseDto, UpdatedCountResponseDto } from '../../common/dto/api-error-response.dto';

@ApiTags('Activities')
@Controller('activities')
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new activity (internal use)' })
    @ApiResponse({ status: 201, description: 'Activity created successfully', type: Activity })
    @ApiBadRequestResponse({ description: 'Invalid input', type: ApiErrorResponseDto })
    async createActivity(@Body() createActivityDto: CreateActivityDto): Promise<Activity> {
        return this.activitiesService.createActivity(createActivityDto);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get paginated activities for a user' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'activityType', required: false, enum: ActivityType, description: 'Optional activity type filter' })
    @ApiOkResponse({ description: 'Activities retrieved successfully', type: PaginatedActivitiesResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid parameters', type: ApiErrorResponseDto })
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
    @ApiOkResponse({ description: 'Activities marked as read successfully', type: UpdatedCountResponseDto })
    @ApiNotFoundResponse({ description: 'Some activities not found', type: ApiErrorResponseDto })
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
    @ApiOkResponse({ description: 'All activities marked as read successfully', type: UpdatedCountResponseDto })
    async markAllAsRead(@Param('userId') userId: string): Promise<{ updated: number }> {
        return this.activitiesService.markAllAsRead(userId);
    }

    @Get(':userId/unread-count')
    @ApiOperation({ summary: 'Get unread count for a user' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiOkResponse({ description: 'Unread count retrieved successfully', type: CountResponseDto })
    async getUnreadCount(@Param('userId') userId: string): Promise<{ count: number }> {
        return this.activitiesService.getUnreadCount(userId);
    }

    @Delete(':userId/:activityId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an activity' })
    @ApiParam({ name: 'userId', description: 'Wallet address of the user' })
    @ApiParam({ name: 'activityId', description: 'ID of the activity to delete' })
    @ApiResponse({ status: 204, description: 'Activity deleted successfully' })
    @ApiNotFoundResponse({ description: 'Activity not found', type: ApiErrorResponseDto })
    async deleteActivity(
        @Param('userId') userId: string,
        @Param('activityId') activityId: string,
    ): Promise<void> {
        return this.activitiesService.deleteActivity(activityId, userId);
    }
}
