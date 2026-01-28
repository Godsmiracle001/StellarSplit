import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EmailService } from "./email.service";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateEmailPreferencesDto {
  @IsOptional()
  @IsBoolean()
  invitations?: boolean;

  @IsOptional()
  @IsBoolean()
  reminders?: boolean;

  @IsOptional()
  @IsBoolean()
  receivedConfirmation?: boolean;

  @IsOptional()
  @IsBoolean()
  completion?: boolean;
}

@ApiTags("Notifications")
@Controller("notifications")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get("preferences/:userId")
  @ApiOperation({ summary: "Get user email preferences" })
  @ApiResponse({ status: 200, description: "Preferences retrieved" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getPreferences(@Param("userId") userId: string) {
    const user = await this.emailService.getUser(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user.emailPreferences;
  }

  @Patch("preferences/:userId")
  @ApiOperation({ summary: "Update user email preferences" })
  @ApiResponse({ status: 200, description: "Preferences updated" })
  async updatePreferences(
    @Param("userId") userId: string,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    const user = await this.emailService.getUser(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updatedPreferences = {
      ...user.emailPreferences,
      ...dto,
    };

    await this.emailService.updatePreferences(userId, updatedPreferences);
    return updatedPreferences;
  }
}
