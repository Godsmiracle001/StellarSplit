import { SetMetadata } from "@nestjs/common";

export interface Permission {
  resource:
    | "split"
    | "receipt"
    | "payment"
    | "export"
    | "invitation"
    | "dispute"
    | "group";
  action: string;
}

export const CHECK_PERMISSIONS_KEY = "permissions";

/**
 * Decorator to specify required permissions for an endpoint
 * @param permissions Array of permissions required to access the endpoint
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(CHECK_PERMISSIONS_KEY, permissions);

// Common permission combinations
export const Permissions = {
  // Split permissions
  CAN_READ_SPLIT: { resource: "split" as const, action: "read" },
  CAN_UPDATE_SPLIT: { resource: "split" as const, action: "update" },
  CAN_DELETE_SPLIT: { resource: "split" as const, action: "delete" },
  CAN_CREATE_SPLIT: { resource: "split" as const, action: "create" },
  CAN_LIST_SPLITS: { resource: "split" as const, action: "list" },
  CAN_CREATE_PAYMENT_FOR_SPLIT: {
    resource: "split" as const,
    action: "create_payment",
  },
  CAN_ADD_PARTICIPANT: {
    resource: "split" as const,
    action: "add_participant",
  },
  CAN_REMOVE_PARTICIPANT: {
    resource: "split" as const,
    action: "remove_participant",
  },

  // Receipt permissions
  CAN_READ_RECEIPT: { resource: "receipt" as const, action: "read" },
  CAN_CREATE_RECEIPT: { resource: "receipt" as const, action: "create" },
  CAN_DELETE_RECEIPT: { resource: "receipt" as const, action: "delete" },

  // Payment permissions
  CAN_CREATE_PAYMENT: { resource: "payment" as const, action: "create" },
  CAN_READ_SPLIT_PAYMENTS: {
    resource: "payment" as const,
    action: "read_split_payments",
  },
  CAN_READ_PARTICIPANT_PAYMENTS: {
    resource: "payment" as const,
    action: "read_participant_payments",
  },

  // Export permissions
  CAN_CREATE_EXPORT: { resource: "export" as const, action: "create" },
  CAN_READ_EXPORT: { resource: "export" as const, action: "read" },
  CAN_DELETE_EXPORT: { resource: "export" as const, action: "delete" },

  // Invitation permissions
  CAN_CREATE_INVITATION: { resource: "invitation" as const, action: "create" },
  CAN_READ_INVITATION: { resource: "invitation" as const, action: "read" },
  CAN_ACCEPT_INVITATION: { resource: "invitation" as const, action: "accept" },

  // Dispute permissions
  CAN_CREATE_DISPUTE: { resource: "dispute" as const, action: "create" },
  CAN_READ_DISPUTE: { resource: "dispute" as const, action: "read" },
  CAN_RESOLVE_DISPUTE: { resource: "dispute" as const, action: "resolve" },
  CAN_REJECT_DISPUTE: { resource: "dispute" as const, action: "reject" },

  // Group permissions
  CAN_READ_GROUP: { resource: "group" as const, action: "read" },
  CAN_UPDATE_GROUP: { resource: "group" as const, action: "update" },
  CAN_DELETE_GROUP: { resource: "group" as const, action: "delete" },
  CAN_CREATE_GROUP: { resource: "group" as const, action: "create" },
  CAN_ADD_GROUP_MEMBER: { resource: "group" as const, action: "add_member" },
  CAN_REMOVE_GROUP_MEMBER: {
    resource: "group" as const,
    action: "remove_member",
  },
  CAN_CREATE_GROUP_SPLIT: {
    resource: "group" as const,
    action: "create_split",
  },
};
