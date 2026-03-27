import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  Permissions,
  RequirePermissions,
} from "../auth/decorators/permissions.decorator";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { JoinInvitationDto } from "./dto/join-invitation.dto";
import { Invitation } from "./invitation.entity";
import { UpgradeGuestDto } from "./dto/upgrade-guest.dto";
import { InvitationsService } from "./invitations.service";
import {
  InvitationCreateResponseDto,
  InvitationJoinResponseDto,
  InvitationResponseDto,
  InvitationUpgradeResponseDto,
} from "./dto/invitation-response.dto";
import { ApiErrorResponseDto } from "../common/dto/api-error-response.dto";

@ApiTags("Invitations")
@Controller("invitations")
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: "Create an invite link for a split" })
  @ApiResponse({ status: 201, description: "Invite link created", type: InvitationCreateResponseDto })
  @ApiNotFoundResponse({ description: "Split not found", type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: "Duplicate invitation exists", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid authentication", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "User lacks permission to create the invitation", type: ApiErrorResponseDto })
  @RequirePermissions(Permissions.CAN_CREATE_INVITATION)
  async create(@Body(ValidationPipe) dto: CreateInvitationDto) {
    return this.invitationsService.create(dto);
  }

  @Get(":token")
  @ApiOperation({
    summary: "Get invite details by token (validates expiry and use)",
  })
  @ApiParam({ name: "token", description: "Invite token (UUID)" })
  @ApiOkResponse({ description: "Invite details", type: InvitationResponseDto })
  @ApiGoneResponse({
    description: "Invite expired or already used (Gone)",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid authentication", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "User lacks permission to view the invitation", type: ApiErrorResponseDto })
  @RequirePermissions(Permissions.CAN_READ_INVITATION)
  async getByToken(@Param("token") token: string): Promise<Invitation> {
    return this.invitationsService.getByToken(token);
  }

  @Post("join/:token")
  @ApiOperation({ summary: "Join a split via invite token" })
  @ApiParam({ name: "token", description: "Invite token (UUID)" })
  @ApiResponse({
    status: 201,
    description: "Joined split; participant created",
    type: InvitationJoinResponseDto,
  })
  @ApiGoneResponse({
    description: "Invite expired or already used (Gone)",
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({ description: "Duplicate participant in split", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid authentication", type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ description: "User lacks permission to accept the invitation", type: ApiErrorResponseDto })
  @RequirePermissions(Permissions.CAN_ACCEPT_INVITATION)
  async join(
    @Param("token") token: string,
    @Body(ValidationPipe) dto: JoinInvitationDto,
  ) {
    return this.invitationsService.joinByToken(token, dto);
  }

  @Post("upgrade-guest")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Upgrade a guest participant to a registered user" })
  @ApiOkResponse({ description: "Guest upgraded to registered user", type: InvitationUpgradeResponseDto })
  @ApiResponse({
    status: 400,
    description: "Participant is already a registered user",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Participant not found", type: ApiErrorResponseDto })
  async upgradeGuest(@Body(ValidationPipe) dto: UpgradeGuestDto) {
    return this.invitationsService.upgradeGuest(dto);
  }

  @Get("split/:splitId/active")
  @ApiOperation({
    summary: "Get all active (non-expired) invitations for a split",
  })
  @ApiParam({ name: "splitId", description: "Split ID (UUID)" })
  @ApiOkResponse({ description: "List of active invitations", type: [InvitationResponseDto] })
  async getActiveInvitations(
    @Param("splitId") splitId: string,
  ): Promise<Invitation[]> {
    return this.invitationsService.getActiveInvitations(splitId);
  }

  @Post(":id/invalidate")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Invalidate/revoke an invitation" })
  @ApiParam({ name: "id", description: "Invitation ID (UUID)" })
  @ApiResponse({ status: 204, description: "Invitation invalidated" })
  @ApiNotFoundResponse({ description: "Invitation not found", type: ApiErrorResponseDto })
  async invalidate(@Param("id") id: string): Promise<void> {
    return this.invitationsService.invalidate(id);
  }
}
