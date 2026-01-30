import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { TestWebhookDto } from './dto/test-webhook.dto';
import { Webhook } from './webhook.entity';
import { WebhookDelivery } from './webhook-delivery.entity';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully',
    type: Webhook,
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async create(@Body(ValidationPipe) createWebhookDto: CreateWebhookDto) {
    return await this.webhooksService.create(createWebhookDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter webhooks by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of webhooks',
    type: [Webhook],
  })
  async findAll(@Query('userId') userId?: string) {
    return await this.webhooksService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook details',
    type: Webhook,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(@Param('id') id: string) {
    return await this.webhooksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: Webhook,
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateWebhookDto: UpdateWebhookDto,
  ) {
    return await this.webhooksService.update(id, updateWebhookDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async remove(@Param('id') id: string) {
    await this.webhooksService.remove(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test a webhook with a sample event' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook triggered successfully',
  })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async testWebhook(
    @Param('id') id: string,
    @Body(ValidationPipe) testDto: TestWebhookDto,
  ) {
    const webhook = await this.webhooksService.findOne(id);

    // Use the delivery service to trigger a test event
    const payload = testDto.payload || {
      test: true,
      message: 'This is a test webhook',
      timestamp: new Date().toISOString(),
    };

    await this.deliveryService.triggerEvent(
      testDto.eventType,
      payload,
      webhook.userId,
    );

    return {
      message: 'Test webhook triggered',
      webhookId: id,
      eventType: testDto.eventType,
    };
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery logs for a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of deliveries to return',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of webhook deliveries',
    type: [WebhookDelivery],
  })
  async getDeliveries(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    await this.webhooksService.findOne(id); // Verify webhook exists
    return await this.deliveryService.getDeliveryLogs(id, limit);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get delivery statistics for a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook delivery statistics',
    schema: {
      example: {
        total: 100,
        success: 95,
        failed: 5,
        pending: 0,
        successRate: 95.0,
      },
    },
  })
  async getStats(@Param('id') id: string) {
    await this.webhooksService.findOne(id); // Verify webhook exists
    return await this.deliveryService.getDeliveryStats(id);
  }
}
