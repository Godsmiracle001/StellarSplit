import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Logger,
  ValidationPipe,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  RecurringSplitsService,
  CreateRecurringSplitDto,
  UpdateRecurringSplitDto,
  UpdateTemplateDto,
} from "./recurring-splits.service";
import { RecurringSplit, RecurrenceFrequency } from "./recurring-split.entity";
import { RecurringSplitsScheduler } from "./recurring-splits.scheduler";

@ApiTags("Recurring Splits")
@Controller("recurring-splits")
export class RecurringSplitsController {
  private readonly logger = new Logger(RecurringSplitsController.name);

  constructor(
    private readonly recurringSplitsService: RecurringSplitsService,
    private readonly scheduler: RecurringSplitsScheduler
  ) {}

  /**
   * Create a new recurring split
   */
  @Post()
  @ApiOperation({
    summary: "Create a recurring split",
    description: "Create a new recurring split from a template split",
  })
  @ApiResponse({
    status: 201,
    description: "Recurring split created",
    type: RecurringSplit,
  })
  async createRecurringSplit(
    @Body(ValidationPipe) dto: CreateRecurringSplitDto
  ): Promise<RecurringSplit> {
    this.logger.log(`Creating recurring split for creator: ${dto.creatorId}`);
    return this.recurringSplitsService.createRecurringSplit(dto);
  }

  /**
   * Get all recurring splits for a creator
   */
  @Get("/creator/:creatorId")
  @ApiOperation({
    summary: "Get all recurring splits for a creator",
    description: "Retrieve all recurring splits created by a specific creator",
  })
  @ApiResponse({
    status: 200,
    description: "Recurring splits retrieved",
    type: [RecurringSplit],
  })
  async getRecurringSplitsByCreator(
    @Param("creatorId") creatorId: string
  ): Promise<RecurringSplit[]> {
    this.logger.log(`Getting recurring splits for creator: ${creatorId}`);
    return this.recurringSplitsService.getRecurringSplitsByCreator(creatorId);
  }

  /**
   * Get statistics for recurring splits
   */
  @Get("/stats/:creatorId")
  @ApiOperation({
    summary: "Get statistics for a creator",
    description: "Get summary statistics of recurring splits for a creator",
  })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved",
  })
  async getStats(@Param("creatorId") creatorId: string): Promise<{
    total: number;
    active: number;
    paused: number;
    nextOccurrences: Array<{ id: string; nextOccurrence: Date }>;
  }> {
    this.logger.log(`Getting stats for creator: ${creatorId}`);
    return this.recurringSplitsService.getRecurringSplitStats(creatorId);
  }

  /**
   * Get a single recurring split by ID
   */
  @Get("/:id")
  @ApiOperation({
    summary: "Get a recurring split by ID",
    description: "Retrieve a specific recurring split by its ID",
  })
  @ApiResponse({
    status: 200,
    description: "Recurring split retrieved",
    type: RecurringSplit,
  })
  @ApiResponse({
    status: 404,
    description: "Recurring split not found",
  })
  async getRecurringSplitById(
    @Param("id") id: string
  ): Promise<RecurringSplit> {
    this.logger.log(`Getting recurring split: ${id}`);
    return this.recurringSplitsService.getRecurringSplitById(id);
  }

  /**
   * Update a recurring split
   */
  @Patch("/:id")
  @ApiOperation({
    summary: "Update a recurring split",
    description:
      "Update settings for a recurring split (frequency, end date, reminders, etc.)",
  })
  @ApiResponse({
    status: 200,
    description: "Recurring split updated",
    type: RecurringSplit,
  })
  async updateRecurringSplit(
    @Param("id") id: string,
    @Body(ValidationPipe) dto: UpdateRecurringSplitDto
  ): Promise<RecurringSplit> {
    this.logger.log(`Updating recurring split: ${id}`);
    return this.recurringSplitsService.updateRecurringSplit(id, dto);
  }

  /**
   * Pause a recurring split
   */
  @Post("/:id/pause")
  @ApiOperation({
    summary: "Pause a recurring split",
    description:
      "Temporarily pause a recurring split. Future splits will not be generated until resumed.",
  })
  @ApiResponse({
    status: 200,
    description: "Recurring split paused",
    type: RecurringSplit,
  })
  async pauseRecurringSplit(@Param("id") id: string): Promise<RecurringSplit> {
    this.logger.log(`Pausing recurring split: ${id}`);
    return this.recurringSplitsService.pauseRecurringSplit(id);
  }

  /**
   * Resume a paused recurring split
   */
  @Post("/:id/resume")
  @ApiOperation({
    summary: "Resume a paused recurring split",
    description:
      "Resume a paused recurring split. Will recalculate next occurrence.",
  })
  @ApiResponse({
    status: 200,
    description: "Recurring split resumed",
    type: RecurringSplit,
  })
  async resumeRecurringSplit(@Param("id") id: string): Promise<RecurringSplit> {
    this.logger.log(`Resuming recurring split: ${id}`);
    return this.recurringSplitsService.resumeRecurringSplit(id);
  }

  /**
   * Delete a recurring split
   */
  @Delete("/:id")
  @ApiOperation({
    summary: "Delete a recurring split",
    description:
      "Delete a recurring split. Already generated splits will not be affected.",
  })
  @ApiResponse({
    status: 204,
    description: "Recurring split deleted",
  })
  async deleteRecurringSplit(@Param("id") id: string): Promise<void> {
    this.logger.log(`Deleting recurring split: ${id}`);
    return this.recurringSplitsService.deleteRecurringSplit(id);
  }

  /**
   * Update the template split
   */
  @Patch("/:id/template")
  @ApiOperation({
    summary: "Update the template split",
    description:
      "Update the template split details. Changes affect future generated splits.",
  })
  @ApiResponse({
    status: 200,
    description: "Template updated",
  })
  async updateTemplate(
    @Param("id") id: string,
    @Body(ValidationPipe) dto: UpdateTemplateDto
  ) {
    this.logger.log(`Updating template for recurring split: ${id}`);
    return this.recurringSplitsService.updateTemplate(id, dto);
  }

  /**
   * Manually trigger processing of a recurring split (for testing/admin)
   */
  @Post("/:id/process-now")
  @ApiOperation({
    summary: "Process a recurring split immediately",
    description:
      "Manually trigger the generation of a split from a recurring split template. For testing and admin purposes.",
  })
  @ApiResponse({
    status: 200,
    description: "Split processed",
  })
  async processNow(@Param("id") id: string): Promise<{ message: string }> {
    this.logger.log(`Manually processing recurring split: ${id}`);
    try {
      await this.scheduler.manuallyProcessRecurringSplit(id);
      return { message: "Recurring split processed successfully" };
    } catch (error) {
      throw new BadRequestException(
        `Failed to process recurring split: ${error}`
      );
    }
  }
}
