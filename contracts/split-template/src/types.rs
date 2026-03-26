//! # Custom Types for Split Template Contract
//!
//! Core data structures for managing reusable split templates.

use soroban_sdk::{contracterror, contracttype, Address, String, Vec};

/// Defines how a split is divided among participants.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SplitType {
    /// Split equally among all participants
    Equal = 0,
    /// Split by percentage (shares sum to 100)
    Percentage = 1,
    /// Split by fixed amounts
    Fixed = 2,
}

/// A participant in a split template with their share/allocation.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Participant {
    /// The participant's Stellar address
    pub address: Address,
    /// Share value: for Equal type, meaningless; for Percentage, 0-100; for Fixed, amount
    pub share: i128,
}

/// A reusable split template that can be applied to multiple splits.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Template {
    /// Unique deterministic ID based on creator + name + timestamp
    pub id: String,
    /// Address of the template creator
    pub creator: Address,
    /// Human-readable template name
    pub name: String,
    /// How this template divides funds
    pub split_type: SplitType,
    /// List of participants and their shares
    pub participants: Vec<Participant>,
    /// Template schema version
    pub version: u32,
}

/// Contract errors
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// Template with the given ID was not found
    TemplateNotFound = 1,
    /// Participants list is empty
    InvalidParticipants = 2,
    /// Shares are invalid for the given split type
    InvalidShares = 3,
    /// Template version is incompatible with the current contract
    IncompatibleVersion = 4,
}
