//! # Custom Types for Split Escrow Contract
//!
//! I'm defining all the core data structures here to keep them organized
//! and easily importable throughout the contract.
//!
//! This module includes both the original types and the enhanced escrow
//! types as specified in issue #59.

use soroban_sdk::{contracttype, Address, Env, String, Vec};

// ============================================
// Original Types (preserved for compatibility)
// ============================================

/// Status of a split throughout its lifecycle
///
/// I designed these states to cover the full lifecycle:
/// - Pending: Created but no deposits yet
/// - Active: At least one deposit received
/// - Completed: All participants have paid their share
/// - Released: Funds have been released to the creator
/// - Cancelled: Split was cancelled, refunds may be needed
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SplitStatus {
    Pending,
    Active,
    Completed,
    Released,
    Cancelled,
}

/// A participant in a split
///
/// I'm tracking both the owed amount and paid amount separately
/// to support partial payments and payment verification.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Participant {
    /// The participant's Stellar address
    pub address: Address,

    /// The amount this participant owes
    pub share_amount: i128,

    /// The amount this participant has paid so far
    pub amount_paid: i128,

    /// Whether the participant has fully paid their share
    pub has_paid: bool,
}

/// A bill split record
///
/// I'm storing all split data in a single struct for atomic operations.
/// The participants vector allows any number of people to share a bill.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Split {
    /// Unique identifier for this split
    pub id: u64,

    /// The address that created this split
    pub creator: Address,

    /// Human-readable description (e.g., "Dinner at Joe's")
    pub description: String,

    /// Total amount to be split among participants
    pub total_amount: i128,

    /// Amount collected so far from participants
    pub amount_collected: i128,

    /// List of participants and their share details
    pub participants: Vec<Participant>,

    /// Current status of the split
    pub status: SplitStatus,

    /// Timestamp when the split was created
    pub created_at: u64,
}

/// Configuration for the contract
///
/// I'm keeping this minimal for now but it can be extended
/// to include fee settings, limits, etc.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ContractConfig {
    /// The contract administrator address
    pub admin: Address,

    /// Whether the contract is paused
    pub is_paused: bool,
}

// ============================================
// Enhanced Escrow Types (Issue #59)
// ============================================

/// Escrow status enum matching issue #59 specification
///
/// I'm using a separate enum for the escrow system to clearly
/// distinguish between the original split flow and the new escrow flow.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    /// Escrow is active and accepting payments
    Active,
    /// All payments received, ready for release
    Completed,
    /// Escrow was cancelled by creator
    Cancelled,
    /// Deadline passed without completion
    Expired,
}

/// Enhanced participant structure with payment timestamp
///
/// I'm adding `paid_at` to track exactly when each participant
/// completed their payment, which is useful for auditing and disputes.
#[contracttype]
#[derive(Clone, Debug)]
pub struct EscrowParticipant {
    /// The participant's Stellar address
    pub address: Address,

    /// The amount this participant owes
    pub amount_owed: i128,

    /// The amount this participant has paid so far
    pub amount_paid: i128,

    /// Timestamp when the participant fully paid (None if not yet paid)
    pub paid_at: Option<u64>,
}

/// Main escrow structure matching issue #59 specification
///
/// I designed this to support the full escrow lifecycle with
/// deadline enforcement and detailed participant tracking.
#[contracttype]
#[derive(Clone, Debug)]
pub struct SplitEscrow {
    /// Unique split identifier (string format for flexibility)
    pub split_id: String,

    /// Split creator address (who receives funds on completion)
    pub creator: Address,

    /// Human-readable description of the split
    pub description: String,

    /// Total amount to be collected from all participants
    pub total_amount: i128,

    /// Amount collected so far
    pub amount_collected: i128,

    /// List of participants and their payment details
    pub participants: Vec<EscrowParticipant>,

    /// Current status of the escrow
    pub status: EscrowStatus,

    /// Unix timestamp deadline for payment completion
    pub deadline: u64,

    /// Unix timestamp when the escrow was created
    pub created_at: u64,
}

// ============================================
// Validation Helpers
// ============================================

impl SplitEscrow {
    /// Check if the escrow has expired based on current timestamp
    ///
    /// I'm providing this helper so contract logic can easily
    /// check expiry without duplicating the comparison everywhere.
    pub fn is_expired(&self, current_timestamp: u64) -> bool {
        current_timestamp > self.deadline && self.status == EscrowStatus::Active
    }

    /// Validate escrow invariants
    ///
    /// I'm checking that the escrow data is internally consistent:
    /// - Amount collected doesn't exceed total
    /// - Participant amounts sum correctly
    /// - Status matches the payment state
    pub fn validate(&self) -> Result<(), &'static str> {
        // Check amount bounds
        if self.amount_collected > self.total_amount {
            return Err("Collected amount exceeds total");
        }

        if self.amount_collected < 0 || self.total_amount < 0 {
            return Err("Amounts cannot be negative");
        }

        // Verify participant amounts sum correctly
        let mut participant_total: i128 = 0;
        let mut paid_total: i128 = 0;

        for i in 0..self.participants.len() {
            let p = self.participants.get(i).unwrap();
            participant_total += p.amount_owed;
            paid_total += p.amount_paid;

            // Each participant's paid amount shouldn't exceed owed
            if p.amount_paid > p.amount_owed {
                return Err("Participant overpaid");
            }
        }

        // Total owed should match escrow total
        if participant_total != self.total_amount {
            return Err("Participant amounts don't sum to total");
        }

        // Collected should match sum of paid amounts
        if paid_total != self.amount_collected {
            return Err("Collected amount mismatch");
        }

        Ok(())
    }

    /// Check if all participants have fully paid
    pub fn is_fully_funded(&self) -> bool {
        self.amount_collected >= self.total_amount
    }

    /// Get the remaining amount needed to complete the escrow
    pub fn remaining_amount(&self) -> i128 {
        self.total_amount - self.amount_collected
    }
}

impl EscrowParticipant {
    /// Validate participant data
    ///
    /// I'm ensuring the participant data is internally consistent.
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.amount_owed < 0 {
            return Err("Amount owed cannot be negative");
        }

        if self.amount_paid < 0 {
            return Err("Amount paid cannot be negative");
        }

        if self.amount_paid > self.amount_owed {
            return Err("Amount paid exceeds amount owed");
        }

        // If fully paid, paid_at should be set
        if self.amount_paid >= self.amount_owed && self.paid_at.is_none() {
            return Err("Fully paid participant missing paid_at timestamp");
        }

        Ok(())
    }

    /// Check if participant has fully paid their share
    pub fn has_fully_paid(&self) -> bool {
        self.amount_paid >= self.amount_owed
    }

    /// Get remaining amount owed by this participant
    pub fn remaining_owed(&self) -> i128 {
        self.amount_owed - self.amount_paid
    }
}

// ============================================
// Factory Functions
// ============================================

impl EscrowParticipant {
    /// Create a new participant with zero payments
    pub fn new(address: Address, amount_owed: i128) -> Self {
        Self {
            address,
            amount_owed,
            amount_paid: 0,
            paid_at: None,
        }
    }
}

/// Helper to create a new escrow with default values
///
/// I'm providing this to ensure escrows are created consistently.
pub fn create_escrow(
    env: &Env,
    split_id: String,
    creator: Address,
    description: String,
    total_amount: i128,
    participants: Vec<EscrowParticipant>,
    deadline: u64,
) -> SplitEscrow {
    SplitEscrow {
        split_id,
        creator,
        description,
        total_amount,
        amount_collected: 0,
        participants,
        status: EscrowStatus::Active,
        deadline,
        created_at: env.ledger().timestamp(),
    }
}
