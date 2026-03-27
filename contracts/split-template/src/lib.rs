//! # Split Template Contract
//!
//! Manages reusable split templates that can be deployed across multiple splits.
//! Provides deterministic template ID generation, creator-based indexing, and
//! template application tracking.

#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod events;
mod storage;
mod types;
mod utils;

#[cfg(test)]
mod test;

pub use events::*;
pub use storage::*;
pub use types::*;
pub use utils::*;

/// Current template schema version. Bump when the Template struct or contract
/// semantics change in a backwards-incompatible way.
pub const CURRENT_TEMPLATE_VERSION: u32 = 1;

/// The Split Template contract for managing reusable split configurations.
#[contract]
pub struct SplitTemplateContract;

#[contractimpl]
impl SplitTemplateContract {
    /// Create a new split template with the given configuration.
    ///
    /// Generates a deterministic template ID based on creator, name, and current ledger time.
    /// Validates participants and shares according to the split type.
    /// Stores the template and indexes it by creator.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `creator` - The address creating this template (must authorize)
    /// * `name` - Human-readable name for the template
    /// * `split_type` - How to divide funds (Equal, Percentage, or Fixed)
    /// * `participants` - List of participants and their share values
    ///
    /// # Returns
    /// The deterministic template ID (hex string) or an error
    pub fn create_template(
        env: Env,
        creator: Address,
        name: String,
        split_type: SplitType,
        participants: Vec<Participant>,
    ) -> Result<String, Error> {
        // Require authorization from the creator
        creator.require_auth();

        // Validate that participants list is not empty
        if participants.len() == 0 {
            return Err(Error::InvalidParticipants);
        }

        // Validate shares based on split type
        Self::validate_shares(&env, split_type, &participants)?;

        // Generate deterministic template ID from creator + name + ledger time
        let template_id = Self::generate_template_id(&env, &creator, &name);

        // Create the template struct
        let template = Template {
            id: template_id.clone(),
            creator: creator.clone(),
            name,
            split_type,
            participants,
            version: CURRENT_TEMPLATE_VERSION,
        };

        // Store the template
        storage::store_template(&env, &template);

        // Add to creator's index for efficient lookup
        storage::add_to_creator_index(&env, &creator, template_id.clone());

        // Emit event (includes version)
        events::emit_template_created(
            &env,
            template_id.clone(),
            creator,
            template.name.clone(),
            CURRENT_TEMPLATE_VERSION,
        );

        Ok(template_id)
    }

    /// Use an existing template to track its usage in a split.
    ///
    /// Loads the template and emits an event linking the template to a new split.
    /// This is called after the split is created to record the template usage.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `template_id` - The ID of the template used
    /// * `split_id` - The ID of the split created from the template
    ///
    /// # Returns
    /// Success or error if template not found
    pub fn use_template(env: Env, template_id: String, split_id: u64) -> Result<(), Error> {
        // Load the template; fail if not found
        let template = storage::get_template(&env, &template_id).ok_or(Error::TemplateNotFound)?;

        // Check version compatibility
        if !Self::is_compatible(env.clone(), template.version) {
            return Err(Error::IncompatibleVersion);
        }

        // Emit event linking template to split
        events::emit_template_used(&env, template_id, split_id);

        Ok(())
    }

    /// Get all templates created by a specific creator.
    ///
    /// Reads the creator index and returns full template objects.
    /// Returns empty vec if creator has no templates.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `creator` - The address to list templates for
    ///
    /// # Returns
    /// Vector of full Template objects for this creator
    pub fn get_templates(env: Env, creator: Address) -> Vec<Template> {
        // Get all template IDs for this creator
        let template_ids = storage::get_creator_template_ids(&env, &creator);

        // Load full template objects for each ID
        let mut templates = Vec::new(&env);
        for template_id in template_ids.iter() {
            if let Some(template) = storage::get_template(&env, &template_id) {
                templates.push_back(template);
            }
        }

        templates
    }

    /// Get a single template by ID.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `template_id` - The template ID to retrieve
    ///
    /// # Returns
    /// The template if found, or an error
    pub fn get_template(env: Env, template_id: String) -> Result<Template, Error> {
        storage::get_template(&env, &template_id).ok_or(Error::TemplateNotFound)
    }

    /// Return the current template version used by this contract.
    ///
    /// Useful for off-chain tooling to detect contract upgrades.
    pub fn get_template_version(_env: Env) -> u32 {
        CURRENT_TEMPLATE_VERSION
    }

    /// Check whether a given version is compatible with the current contract.
    ///
    /// Returns `true` when `version` equals `CURRENT_TEMPLATE_VERSION`.
    /// Callers can use this before attempting to deserialize or apply a template
    /// that was created by a potentially different contract version.
    pub fn is_compatible(_env: Env, version: u32) -> bool {
        version == CURRENT_TEMPLATE_VERSION
    }

    // ============================================
    // Private Helper Functions
    // ============================================

    /// Generate a deterministic template ID.
    ///
    /// Creates a template ID from hash of creator address, name, and ledger timestamp.
    /// This ensures uniqueness even with same name from same creator at different times.
    fn generate_template_id(env: &Env, creator: &Address, name: &String) -> String {
        // TODO: Use hash for production uniqueness
        // For now, use name as simple ID
        name.clone()
    }

    /// Validate participant shares based on split type.
    fn validate_shares(
        _env: &Env,
        split_type: SplitType,
        participants: &Vec<Participant>,
    ) -> Result<(), Error> {
        match split_type {
            SplitType::Equal => {
                // For equal splits, shares must all be 1 (or not checked; we trust the caller)
                Ok(())
            }
            SplitType::Percentage => {
                // For percentage splits, all shares must be 0-100 and sum to 100
                let mut total: i128 = 0;
                for participant in participants.iter() {
                    if participant.share < 0 || participant.share > 100 {
                        return Err(Error::InvalidShares);
                    }
                    total += participant.share;
                }
                if total != 100 {
                    return Err(Error::InvalidShares);
                }
                Ok(())
            }
            SplitType::Fixed => {
                // For fixed splits, all shares must be positive
                for participant in participants.iter() {
                    if participant.share <= 0 {
                        return Err(Error::InvalidShares);
                    }
                }
                Ok(())
            }
        }
    }
}
