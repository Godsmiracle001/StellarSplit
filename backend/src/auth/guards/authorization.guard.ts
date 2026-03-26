import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../services/authorization.service';
import { CHECK_PERMISSIONS_KEY, Permission } from '../decorators/permissions.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      CHECK_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No specific permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract resource IDs from request parameters
    const params = request.params;
    const body = request.body;

    for (const permission of requiredPermissions) {
      const hasPermission = await this.checkPermission(
        user.id,
        permission,
        params,
        body,
        request,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions for ${permission.action} on ${permission.resource}`,
        );
      }
    }

    return true;
  }

  private async checkPermission(
    userId: string,
    permission: Permission,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    const { resource, action } = permission;

    switch (resource) {
      case 'split':
        return this.checkSplitPermission(userId, action, params, body, request);
      case 'receipt':
        return this.checkReceiptPermission(userId, action, params, body, request);
      case 'payment':
        return this.checkPaymentPermission(userId, action, params, body, request);
      case 'export':
        return this.checkExportPermission(userId, action, params, body, request);
      case 'invitation':
        return this.checkInvitationPermission(userId, action, params, body, request);
      case 'dispute':
        return this.checkDisputePermission(userId, action, params, body, request);
      case 'group':
        return this.checkGroupPermission(userId, action, params, body, request);
      default:
        return false;
    }
  }

  private async checkSplitPermission(
    userId: string,
    action: string,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    const splitId = params.splitId || params.id || body.splitId;
    
    if (!splitId && (action === 'create' || action === 'list')) {
      // For creation and listing, we check at service level
      return true;
    }

    if (!splitId) {
      return false;
    }

    switch (action) {
      case 'read':
      case 'update':
      case 'delete':
        return this.authorizationService.canAccessSplit(userId, splitId);
      case 'create_payment':
        return this.authorizationService.canCreatePayment(userId, splitId);
      case 'add_participant':
        return this.authorizationService.canAddParticipant(userId, splitId);
      case 'remove_participant':
        return this.authorizationService.canRemoveParticipant(userId, splitId);
      default:
        return false;
    }
  }

  private async checkReceiptPermission(
    userId: string,
    action: string,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    const receiptId = params.receiptId || params.id || body.receiptId;
    const splitId = params.splitId || body.splitId;

    if (action === 'create' && splitId) {
      return this.authorizationService.canAccessSplit(userId, splitId);
    }

    if (!receiptId) {
      return false;
    }

    switch (action) {
      case 'read':
      case 'delete':
        return this.authorizationService.canAccessReceipt(userId, receiptId);
      default:
        return false;
    }
  }

  private async checkPaymentPermission(
    userId: string,
    action: string,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    const splitId = params.splitId || body.splitId;
    const participantId = params.participantId || body.participantId;

    switch (action) {
      case 'create':
        if (splitId && participantId) {
          return this.authorizationService.canCreatePaymentForParticipant(
            userId,
            splitId,
            participantId,
          );
        }
        return false;
      case 'read_split_payments':
        return splitId ? this.authorizationService.canAccessSplit(userId, splitId) : false;
      case 'read_participant_payments':
        return participantId
          ? this.authorizationService.canAccessParticipantPayments(userId, participantId)
          : false;
      default:
        return false;
    }
  }

  private async checkExportPermission(
    userId: string,
    action: string,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    // Export permissions are typically user-scoped
    return true; // User can only export their own data, enforced at service level
  }

  private async checkInvitationPermission(
    userId: string,
    action: string,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    const splitId = body.splitId;

    switch (action) {
      case 'create':
        return splitId ? this.authorizationService.canAccessSplit(userId, splitId) : false;
      case 'read':
      case 'accept':
        // Invitations can be read/accepted by anyone with the token
        return true;
      default:
        return false;
    }
  }

  private async checkDisputePermission(
    userId: string,
    action: string,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    const disputeId = params.disputeId || params.id;
    const splitId = params.splitId || body.splitId;

    switch (action) {
      case 'create':
        return splitId ? this.authorizationService.canAccessSplit(userId, splitId) : false;
      case 'read':
        return disputeId ? this.authorizationService.canAccessDispute(userId, disputeId) : false;
      case 'resolve':
      case 'reject':
        // Admin actions - check if user is admin
        return this.authorizationService.isAdmin(userId);
      default:
        return false;
    }
  }

  private async checkGroupPermission(
    userId: string,
    action: string,
    params: any,
    body: any,
    request: any,
  ): Promise<boolean> {
    const groupId = params.id || params.groupId;

    if (!groupId && action === 'create') {
      return true; // Users can create groups
    }

    if (!groupId) {
      return false;
    }

    switch (action) {
      case 'read':
      case 'update':
      case 'delete':
        return this.authorizationService.canAccessGroup(userId, groupId);
      case 'add_member':
      case 'remove_member':
        return this.authorizationService.canManageGroupMembers(userId, groupId);
      case 'create_split':
        return this.authorizationService.canCreateGroupSplit(userId, groupId);
      default:
        return false;
    }
  }
}
