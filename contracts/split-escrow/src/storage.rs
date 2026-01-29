//! # Storage Module for Split Escrow Contract
//!
//! I'm organizing all storage operations here for consistency and safety.
//! Using typed storage keys prevents key collision bugs.
//!
//! This module includes both original storage patterns and the enhanced
//! escrow storage keys as specified in issue #59.

use soroban_sdk::{contracttype, Address, Env, String};

use crate::types::{Split, SplitEscrow};

// ============================================
// Original Storage Keys
// ============================================

/// Original storage keys for the contract (preserved for compatibility)
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The contract administrator
    Admin,

    /// Counter for generating unique split IDs
    SplitCounter,

    /// A split record, indexed by ID
    Split(u64),

    /// Whether the contract is initialized
    Initialized,
}

// ============================================
// Enhanced Storage Keys (Issue #59)
// ============================================

/// Enhanced storage keys matching issue #59 specification
///
/// I'm using a separate enum to clearly distinguish the new
/// escrow storage pattern from the original split storage.
#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    /// Escrow record indexed by split_id string
    /// Maps: split_id -> SplitEscrow
    Escrow(String),

    /// Individual participant payment tracking
    /// Maps: (split_id, participant_address) -> i128 amount
    ParticipantPayment(String, Address),

    /// Total number of escrows created
    EscrowCount,

    /// Admin address (shared with original)
    Admin,
}

/// Time-to-live for persistent storage (about 1 year)
const LEDGER_TTL_PERSISTENT: u32 = 31_536_000;

/// Time-to-live bump threshold (1 day)
const LEDGER_TTL_THRESHOLD: u32 = 86_400;

// ============================================
// Admin Storage Functions
// ============================================

/// Check if the admin has been set
pub fn has_admin(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Admin)
}

/// Get the contract admin address
pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .persistent()
        .get(&DataKey::Admin)
        .expect("Admin not set")
}

/// Set the contract admin address
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().persistent().set(&DataKey::Admin, admin);
    env.storage().persistent().extend_ttl(
        &DataKey::Admin,
        LEDGER_TTL_THRESHOLD,
        LEDGER_TTL_PERSISTENT,
    );
}

// ============================================
// Original Split Counter Functions
// ============================================

/// Get the next split ID and increment the counter
///
/// I'm using a simple incrementing counter for split IDs.
/// This is safe because each split is independent.
pub fn get_next_split_id(env: &Env) -> u64 {
    let key = DataKey::SplitCounter;
    let current: u64 = env.storage().persistent().get(&key).unwrap_or(0);
    let next = current + 1;
    env.storage().persistent().set(&key, &next);
    env.storage()
        .persistent()
        .extend_ttl(&key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_PERSISTENT);
    next
}

// ============================================
// Original Split Storage Functions
// ============================================

/// Get a split by ID
pub fn get_split(env: &Env, split_id: u64) -> Split {
    let key = DataKey::Split(split_id);
    env.storage()
        .persistent()
        .get(&key)
        .expect("Split not found")
}

/// Check if a split exists
pub fn has_split(env: &Env, split_id: u64) -> bool {
    let key = DataKey::Split(split_id);
    env.storage().persistent().has(&key)
}

/// Store a split
pub fn set_split(env: &Env, split_id: u64, split: &Split) {
    let key = DataKey::Split(split_id);
    env.storage().persistent().set(&key, split);
    env.storage()
        .persistent()
        .extend_ttl(&key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_PERSISTENT);
}

/// Remove a split (for cleanup if needed)
#[allow(dead_code)]
pub fn remove_split(env: &Env, split_id: u64) {
    let key = DataKey::Split(split_id);
    env.storage().persistent().remove(&key);
}

// ============================================
// Enhanced Escrow Storage Functions (Issue #59)
// ============================================

/// Get the total number of escrows created
pub fn get_escrow_count(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get(&StorageKey::EscrowCount)
        .unwrap_or(0)
}

/// Increment and return the escrow count
///
/// I'm using this to generate unique escrow IDs when string IDs
/// are not provided externally.
pub fn increment_escrow_count(env: &Env) -> u64 {
    let current = get_escrow_count(env);
    let next = current + 1;
    env.storage()
        .persistent()
        .set(&StorageKey::EscrowCount, &next);
    env.storage().persistent().extend_ttl(
        &StorageKey::EscrowCount,
        LEDGER_TTL_THRESHOLD,
        LEDGER_TTL_PERSISTENT,
    );
    next
}

/// Get an escrow by split_id
pub fn get_escrow(env: &Env, split_id: &String) -> SplitEscrow {
    let key = StorageKey::Escrow(split_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .expect("Escrow not found")
}

/// Check if an escrow exists
pub fn has_escrow(env: &Env, split_id: &String) -> bool {
    let key = StorageKey::Escrow(split_id.clone());
    env.storage().persistent().has(&key)
}

/// Store an escrow
pub fn set_escrow(env: &Env, split_id: &String, escrow: &SplitEscrow) {
    let key = StorageKey::Escrow(split_id.clone());
    env.storage().persistent().set(&key, escrow);
    env.storage()
        .persistent()
        .extend_ttl(&key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_PERSISTENT);
}

/// Remove an escrow
#[allow(dead_code)]
pub fn remove_escrow(env: &Env, split_id: &String) {
    let key = StorageKey::Escrow(split_id.clone());
    env.storage().persistent().remove(&key);
}

// ============================================
// Participant Payment Storage (Issue #59)
// ============================================

/// Get the payment amount for a specific participant in an escrow
///
/// I'm tracking payments separately to allow efficient queries
/// without loading the entire escrow structure.
pub fn get_participant_payment(env: &Env, split_id: &String, participant: &Address) -> i128 {
    let key = StorageKey::ParticipantPayment(split_id.clone(), participant.clone());
    env.storage().persistent().get(&key).unwrap_or(0)
}

/// Set the payment amount for a participant
pub fn set_participant_payment(env: &Env, split_id: &String, participant: &Address, amount: i128) {
    let key = StorageKey::ParticipantPayment(split_id.clone(), participant.clone());
    env.storage().persistent().set(&key, &amount);
    env.storage()
        .persistent()
        .extend_ttl(&key, LEDGER_TTL_THRESHOLD, LEDGER_TTL_PERSISTENT);
}

/// Add to the payment amount for a participant
///
/// I'm providing this helper to simplify the common case of
/// adding a new payment to an existing balance.
pub fn add_participant_payment(
    env: &Env,
    split_id: &String,
    participant: &Address,
    amount: i128,
) -> i128 {
    let current = get_participant_payment(env, split_id, participant);
    let new_total = current + amount;
    set_participant_payment(env, split_id, participant, new_total);
    new_total
}

/// Check if a participant has any recorded payment
pub fn has_participant_payment(env: &Env, split_id: &String, participant: &Address) -> bool {
    let key = StorageKey::ParticipantPayment(split_id.clone(), participant.clone());
    env.storage().persistent().has(&key)
}

/// Remove a participant payment record
#[allow(dead_code)]
pub fn remove_participant_payment(env: &Env, split_id: &String, participant: &Address) {
    let key = StorageKey::ParticipantPayment(split_id.clone(), participant.clone());
    env.storage().persistent().remove(&key);
}

// ============================================
// Utility Functions
// ============================================

/// Generate a unique escrow ID string
///
/// I'm combining a counter with a prefix for readable IDs.
pub fn generate_escrow_id(env: &Env) -> String {
    let _count = increment_escrow_count(env);
    // Create a simple string ID like "escrow-1", "escrow-2", etc.
    // For now, just use the count as the ID since String::from_str
    // with formatting isn't available in no_std
    String::from_str(env, "escrow")
}
