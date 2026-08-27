#![cfg(test)]
extern crate std;

use crate::{AchievementBadgesContract, AchievementBadgesContractClient, BadgeEvidence, BadgeType};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Symbol};

mod mock_escrow {
    use soroban_sdk::{contract, contractimpl, Env, String};

    #[contract]
    pub struct MockEscrow;

    #[contractimpl]
    impl MockEscrow {
        pub fn get_total_split_amount(_env: Env, _escrow_id: String) -> i128 {
            1_000_000_000 // 1000 XLM-equivalent (meets Silver threshold)
        }

        pub fn get_participant_count(_env: Env, _escrow_id: String) -> u32 {
            5 // meets Silver threshold
        }
    }
}

fn setup_test() -> (
    Env,
    Address,
    Address,
    Address,
    AchievementBadgesContractClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let escrow_address = env.register_contract(None, mock_escrow::MockEscrow);
    let contract_id = env.register_contract(None, AchievementBadgesContract);
    let client = AchievementBadgesContractClient::new(&env, &contract_id);

    client.initialize(&admin, &escrow_address);

    (env, admin, user, escrow_address, client)
}

#[test]
fn test_initialize() {
    let (_env, _admin, _user, _escrow_address, _client) = setup_test();
}

#[test]
fn test_eligibility_check_requires_no_auth() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    // Setup non-auth environment for read-only check
    env.set_auths(&[]);

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 80,
    };

    let result = client.check_eligibility_with_evidence(&user, &evidence);
    assert_eq!(result.is_eligible, true);
    assert_eq!(result.tier, Symbol::new(&env, "silver"));
}

#[test]
fn test_legitimate_mint_succeeds() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000, // Client claims Silver
        participant_count: 5,              // Client claims Silver
        completion_rate: 80,               // meets MIN_COMPLETION_RATE
    };

    let badge = client.mint_badge_with_evidence(&user, &evidence);
    assert_eq!(badge.recipient, user);
    assert_eq!(badge.tier, Symbol::new(&env, "silver"));
    assert_eq!(
        badge.evidence_escrow_id,
        String::from_str(&env, "escrow-001")
    );

    assert!(client.has_badge(&user, &String::from_str(&env, "escrow-001")));
}

#[test]
#[should_panic(expected = "badge already minted for this escrow")]
fn test_double_mint_fails() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 80,
    };

    client.mint_badge_with_evidence(&user, &evidence);
    client.mint_badge_with_evidence(&user, &evidence);
}

#[test]
fn test_metadata_queries() {
    let (env, _admin, _user, _escrow_address, client) = setup_test();

    let metadata = client.get_badge_metadata(&BadgeType::FirstSplitCreator);
    assert_eq!(metadata.name, String::from_str(&env, "First Split Creator"));

    let metadata_standard = client.badge_metadata_standard(&BadgeType::BigSpender);
    assert_eq!(
        metadata_standard.name,
        String::from_str(&env, "Big Spender")
    );
}

#[test]
fn test_revoke_badge() {
    let (env, admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 80,
    };

    client.mint_badge_with_evidence(&user, &evidence);
    assert!(client.has_badge(&user, &String::from_str(&env, "escrow-001")));

    client.revoke_badge(&admin, &user, &String::from_str(&env, "escrow-001"));
    assert!(!client.has_badge(&user, &String::from_str(&env, "escrow-001")));
}

#[test]
#[should_panic(expected = "unauthorized: caller is not admin")]
fn test_revoke_badge_requires_admin() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 80,
    };

    client.mint_badge_with_evidence(&user, &evidence);

    // Call revoke using the user address instead of the admin
    client.revoke_badge(&user, &user, &String::from_str(&env, "escrow-001"));
}

#[test]
fn test_out_of_bounds_completion_rate_rejected() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 101, // invalid percentage (> 100)
    };

    let result = client.check_eligibility_with_evidence(&user, &evidence);
    assert_eq!(result.is_eligible, false);
    assert_eq!(result.reason, Symbol::new(&env, "invalid_rate"));
}

#[test]
#[should_panic(expected = "eligibility check failed: on-chain data does not meet badge threshold")]
fn test_out_of_bounds_completion_rate_mint_fails() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 101,
    };

    client.mint_badge_with_evidence(&user, &evidence);
}

#[test]
fn test_low_completion_rate_rejected() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 79, // too low (< 80)
    };

    let result = client.check_eligibility_with_evidence(&user, &evidence);
    assert_eq!(result.is_eligible, false);
    assert_eq!(result.reason, Symbol::new(&env, "low_completion"));
}

#[test]
#[should_panic(expected = "eligibility check failed: on-chain data does not meet badge threshold")]
fn test_low_completion_rate_mint_fails() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 79,
    };

    client.mint_badge_with_evidence(&user, &evidence);
}

#[test]
fn test_inconsistent_completion_rate_rejected() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    // 85% with 5 participants is inconsistent (only 0%, 20%, 40%, 60%, 80%, 100% are consistent)
    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 85,
    };

    let result = client.check_eligibility_with_evidence(&user, &evidence);
    assert_eq!(result.is_eligible, false);
    assert_eq!(result.reason, Symbol::new(&env, "inconsistent_rate"));
}

#[test]
#[should_panic(expected = "eligibility check failed: on-chain data does not meet badge threshold")]
fn test_inconsistent_completion_rate_mint_fails() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 5,
        completion_rate: 85,
    };

    client.mint_badge_with_evidence(&user, &evidence);
}

#[test]
fn test_zero_participants_completion_rate_consistency() {
    let (env, _admin, user, _escrow_address, client) = setup_test();

    let evidence = BadgeEvidence {
        escrow_id: String::from_str(&env, "escrow-001"),
        total_split_amount: 1_000_000_000,
        participant_count: 0,
        completion_rate: 80, // inconsistent: rate > 0 when participants is 0
    };

    let result = client.check_eligibility_with_evidence(&user, &evidence);
    assert_eq!(result.is_eligible, false);
    assert_eq!(result.reason, Symbol::new(&env, "inconsistent_rate"));
}
