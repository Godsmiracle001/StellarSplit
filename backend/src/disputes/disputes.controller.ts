import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  Permissions,
  RequirePermissions,
} from "../auth/decorators/permissions.decorator";
import { AuthorizationGuard } from "../auth/guards/authorization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DisputeEvidence } from "../entities/dispute-evidence.entity";
import { Dispute } from "../entities/dispute.entity";
import { AuditTrailEntry, DisputesService } from "./disputes.service";
import {
  AddEvidenceDto,
  AppealDisputeDto,
  FileDisputeDto,
  QueryDisputesDto,
  RequestMoreEvidenceDto,
  ResolveDisputeDto,
  SubmitForReviewDto,
} from "./dto/dispute.dto";

// TODO: Implement these with actual auth guards
// import { AuthGuard } from '@nestjs/passport';
// import { RolesGuard } from '../security/roles.guard';

/**
 * Dispute Resolution API Controller
 * Handlers for all dispute-related operations
 */
@Controller("disputes")
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  /**
   * FILE DISPUTE
   * POST /disputes
   * Creates a new dispute and automatically freezes the split
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permissions.CAN_CREATE_DISPUTE)
  async fileDispute(
    @Body(ValidationPipe) fileDisputeDto: FileDisputeDto,
    // @Request() req: any, // Will contain authenticated user
  ): Promise<Dispute> {
    // TODO: Extract from auth context
    const raisedBy = "G..." as any; // Placeholder - from JWT or session
    return this.disputesService.fileDispute(fileDisputeDto, raisedBy);
  }

  /**
   * ADD EVIDENCE
   * POST /disputes/:disputeId/evidence
   * Adds evidence to a dispute
   */
  @Post(":disputeId/evidence")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permissions.CAN_READ_DISPUTE)
  async addEvidence(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body(ValidationPipe) addEvidenceDto: AddEvidenceDto,
  ): Promise<DisputeEvidence> {
    // TODO: Extract from auth
    const uploadedBy = "G..." as any;
    return this.disputesService.addEvidence(
      { ...addEvidenceDto, disputeId },
      uploadedBy,
    );
  }

  /**
   * GET DISPUTE EVIDENCE
   * GET /disputes/:disputeId/evidence
   * Retrieves all evidence for a dispute
   */
  @Get(":disputeId/evidence")
  @RequirePermissions(Permissions.CAN_READ_DISPUTE)
  async getDisputeEvidence(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
  ): Promise<DisputeEvidence[]> {
    return this.disputesService.getDisputeEvidence(disputeId);
  }

  /**
   * SUBMIT FOR REVIEW
   * POST /disputes/:disputeId/submit-review
   * Moves dispute from evidence collection to under review
   */
  @Post(":disputeId/submit-review")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.CAN_READ_DISPUTE)
  async submitForReview(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body(ValidationPipe) submitForReviewDto: SubmitForReviewDto,
  ): Promise<Dispute> {
    // TODO: Extract from auth
    const performedBy = "G..." as any;
    return this.disputesService.submitForReview(
      { ...submitForReviewDto, disputeId },
      performedBy,
    );
  }

  /**
   * RESOLVE DISPUTE
   * POST /disputes/:disputeId/resolve
   * Admin endpoint: resolves dispute and unfreezes split
   * Requires admin role
   */
  @Post(":disputeId/resolve")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.CAN_RESOLVE_DISPUTE)
  async resolveDispute(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body(ValidationPipe) resolveDisputeDto: ResolveDisputeDto,
  ): Promise<Dispute> {
    // TODO: Extract from auth
    const resolvedBy = "G..." as any;
    return this.disputesService.resolveDispute(
      { ...resolveDisputeDto, disputeId },
      resolvedBy,
    );
  }

  /**
   * REJECT DISPUTE
   * POST /disputes/:disputeId/reject
   * Admin endpoint: rejects dispute and unfreezes split
   * Requires admin role
   */
  @Post(":disputeId/reject")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.CAN_REJECT_DISPUTE)
  async rejectDispute(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body() body: { reason: string },
  ): Promise<Dispute> {
    // TODO: Extract from auth
    const performedBy = "G..." as any;
    return this.disputesService.rejectDispute(
      disputeId,
      body.reason,
      performedBy,
    );
  }

  /**
   * APPEAL DISPUTE
   * POST /disputes/:disputeId/appeal
   * Only dispute creator can appeal within 30 days
   */
  @Post(":disputeId/appeal")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.CAN_READ_DISPUTE)
  async appealDispute(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body(ValidationPipe) appealDisputeDto: AppealDisputeDto,
  ): Promise<Dispute> {
    // TODO: Extract from auth
    const appealedBy = "G..." as any;
    return this.disputesService.appealDispute(
      { ...appealDisputeDto, disputeId },
      appealedBy,
    );
  }

  /**
   * REQUEST MORE EVIDENCE
   * POST /disputes/:disputeId/request-evidence
   * Admin endpoint: requests additional evidence
   */
  @Post(":disputeId/request-evidence")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.CAN_REJECT_DISPUTE)
  async requestMoreEvidence(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
    @Body(ValidationPipe) requestDto: RequestMoreEvidenceDto,
  ): Promise<Dispute> {
    // TODO: Extract from auth
    const requestedBy = "G..." as any;
    return this.disputesService.requestMoreEvidence(
      { ...requestDto, disputeId },
      requestedBy,
    );
  }

  /**
   * GET DISPUTES BY SPLIT
   * GET /disputes/split/:splitId
   * Retrieves all disputes for a specific split
   */
  @Get("split/:splitId")
  @RequirePermissions(Permissions.CAN_READ_DISPUTE)
  async getDisputesBySplit(
    @Param("splitId", ParseUUIDPipe) splitId: string,
  ): Promise<Dispute[]> {
    return this.disputesService.getDisputesBySplit(splitId);
  }

  /**
   * GET DISPUTE BY ID
   * GET /disputes/:disputeId
   * Retrieves full dispute details including audit trail
   */
  @Get(":disputeId")
  @RequirePermissions(Permissions.CAN_READ_DISPUTE)
  async getDisputeById(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
  ): Promise<Dispute> {
    return this.disputesService.getDisputeById(disputeId);
  }

  /**
   * ADMIN LIST DISPUTES
   * GET /disputes
   * Admin endpoint: lists all disputes with filtering
   * Requires admin role
   */
  @Get()
  @RequirePermissions(Permissions.CAN_REJECT_DISPUTE)
  async adminListDisputes(
    @Query() queryDto: QueryDisputesDto,
  ): Promise<{ disputes: Dispute[]; total: number }> {
    return this.disputesService.adminListDisputes(queryDto);
  }

  /**
   * GET DISPUTE AUDIT TRAIL
   * GET /disputes/:disputeId/audit-trail
   * Retrieves the full audit trail for a dispute
   */
  @Get(":disputeId/audit-trail")
  @RequirePermissions(Permissions.CAN_READ_DISPUTE)
  async getDisputeAuditTrail(
    @Param("disputeId", ParseUUIDPipe) disputeId: string,
  ): Promise<AuditTrailEntry[]> {
    return this.disputesService.getDisputeAuditTrail(disputeId);
  }
}
