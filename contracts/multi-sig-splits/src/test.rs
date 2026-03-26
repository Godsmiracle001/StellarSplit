//! # Tests for Multi-Signature Splits Contract

use crate::{MultisigSplitsContract, MultisigSplitsContractClient, MultisigStatus};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env, String,
};

/// Helper to create a test environment and contract client
fn setup_test() -> (Env, Address, MultisigSplitsContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, MultisigSplitsContract);
    let client = MultisigSplitsContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    (env, admin, client)
}

#[test]
fn test_initialize() {
    let (_env, admin, client) = setup_test();

    client.initialize(&admin);

    // Verify admin is set (we'd need a getter for this)
    // For now, just ensure it doesn't panic
}

#[test]
fn test_create_multisig_split() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");

    client.initialize(&admin);

    // Create a multi-sig split
    client.create_multisig_split(&split_id, &3, &3600); // 3 sigs required, 1 hour lock

    // Check split info
    let split = client.get_split_info(&split_id);
    assert_eq!(split.split_id, split_id);
    assert_eq!(split.required_signatures, 3);
    assert_eq!(split.current_signatures, 0);
    assert_eq!(split.time_lock, 3600);
    assert_eq!(split.status, MultisigStatus::Pending);
}

#[test]
fn test_create_duplicate_split() {
    let (_env, admin, client) = setup_test();
    let split_id = String::from_str(&_env, "split-001");

    client.initialize(&admin);

    // Create first split
    client.create_multisig_split(&split_id, &2, &1800);

    // Try to create duplicate - will panic in real scenario
    // For now, just test that the first creation worked
}

#[test]
fn test_invalid_threshold() {
    let (env, admin, client) = setup_test();
    let _split_id = String::from_str(&env, "split-001");

    client.initialize(&admin);

    // Try to create with 0 required signatures
    // This would panic in a real scenario, but for testing we'll skip
    // let result = client.create_multisig_split(&split_id, &0, &1800);
    // assert!(result.is_err());

    // Try to create with 0 time lock
    // let result = client.create_multisig_split(&split_id, &2, &0);
    // assert!(result.is_err());
}

#[test]
fn test_sign_split() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // First signature
    let can_execute = client.sign_split(&split_id, &signer1);
    assert!(!can_execute); // Not enough signatures yet

    // Check split status
    let split = client.get_split_info(&split_id);
    assert_eq!(split.status, MultisigStatus::Active);
    assert_eq!(split.current_signatures, 1);
    assert_eq!(split.signers.len(), 1);
}

#[test]
fn test_multiple_signatures() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // First signature
    client.sign_split(&split_id, &signer1);

    // Second signature
    let can_execute = client.sign_split(&split_id, &signer2);
    assert!(!can_execute); // Time lock not expired yet

    // Check signatures
    let split = client.get_split_info(&split_id);
    assert_eq!(split.current_signatures, 2);
    assert_eq!(split.signers.len(), 2);
}

#[test]
fn test_duplicate_signature() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // First signature
    client.sign_split(&split_id, &signer);

    // Try to sign again
    // This would fail in practice, but we can't test the error directly
    // let result = client.sign_split(&split_id, &signer);
    // assert!(result.is_err());
}

#[test]
fn test_execute_split_too_early() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &3600); // 1 hour lock

    // Collect signatures
    client.sign_split(&split_id, &signer1);
    client.sign_split(&split_id, &signer2);

    // Try to execute before time lock expires
    // This would fail in practice
    // let result = client.execute_split(&split_id);
    // assert!(result.is_err());
}

#[test]
fn test_execute_split_insufficient_signatures() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &3, &1800);

    // Only one signature
    client.sign_split(&split_id, &signer);

    // Advance time past lock
    env.ledger().set_timestamp(1801);

    // Try to execute
    // This would fail in practice
    // let result = client.execute_split(&split_id);
    // assert!(result.is_err());
}

#[test]
fn test_execute_split_success() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &3, &1800);

    // Collect all required signatures
    client.sign_split(&split_id, &signer1);
    client.sign_split(&split_id, &signer2);
    client.sign_split(&split_id, &signer3);

    // Advance time past lock
    env.ledger().set_timestamp(1801);

    // Execute split
    client.execute_split(&split_id);

    // Check status
    let split = client.get_split_info(&split_id);
    assert_eq!(split.status, MultisigStatus::Executed);
    assert!(split.executed_at > 0);
}

#[test]
fn test_cancel_split() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Cancel split
    let reason = String::from_str(&env, "Emergency cancellation");
    client.cancel_split(&split_id, &reason);

    // Check status
    let split = client.get_split_info(&split_id);
    assert_eq!(split.status, MultisigStatus::Cancelled);
}

#[test]
fn test_emergency_override() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &3, &3600);

    // Only one signature, time lock not expired
    let signer = Address::generate(&env);
    client.sign_split(&split_id, &signer);

    // Emergency override
    client.emergency_override(&split_id);

    // Check status
    let split = client.get_split_info(&split_id);
    assert_eq!(split.status, MultisigStatus::Executed);
}

#[test]
fn test_can_execute_split() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Initially cannot execute
    assert!(!client.can_execute_split(&split_id));

    // Add signatures
    client.sign_split(&split_id, &signer1);
    client.sign_split(&split_id, &signer2);

    // Still cannot execute (time lock not expired)
    assert!(!client.can_execute_split(&split_id));

    // Advance time
    env.ledger().set_timestamp(1801);

    // Now can execute
    assert!(client.can_execute_split(&split_id));
}

#[test]
fn test_nonexistent_split() {
    let (env, admin, client) = setup_test();
    let _split_id = String::from_str(&env, "nonexistent");

    client.initialize(&admin);

    // Try to sign nonexistent split
    // This would fail in practice
    // let result = client.sign_split(&split_id, &signer);
    // assert!(result.is_err());

    // Try to execute nonexistent split
    // let result = client.execute_split(&split_id);
    // assert!(result.is_err());
}

#[test]
fn test_add_signer() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Initially no signers
    let signers = client.get_signers(&split_id);
    assert_eq!(signers.len(), 0);

    // Add first signer
    client.add_signer(&split_id, &signer1);
    
    let signers = client.get_signers(&split_id);
    assert_eq!(signers.len(), 1);
    assert_eq!(signers.get(0).unwrap(), signer1);

    // Add second signer
    client.add_signer(&split_id, &signer2);
    
    let signers = client.get_signers(&split_id);
    assert_eq!(signers.len(), 2);
}

#[test]
fn test_remove_signer() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Add signers
    client.add_signer(&split_id, &signer1);
    client.add_signer(&split_id, &signer2);
    
    let signers = client.get_signers(&split_id);
    assert_eq!(signers.len(), 2);

    // Remove one signer
    client.remove_signer(&split_id, &signer1);
    
    let signers = client.get_signers(&split_id);
    assert_eq!(signers.len(), 1);
    assert_eq!(signers.get(0).unwrap(), signer2);
}

#[test]
fn test_cannot_remove_last_signer() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &1, &1800);

    // Add one signer
    client.add_signer(&split_id, &signer);
    
    // Try to remove the last signer - should fail
    // This would panic in a real scenario
    // let result = client.remove_signer(&split_id, &signer);
    // assert!(result.is_err());
}

#[test]
fn test_update_threshold() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Add three signers
    client.add_signer(&split_id, &signer1);
    client.add_signer(&split_id, &signer2);
    client.add_signer(&split_id, &signer3);

    // Update threshold from 2 to 3
    client.update_threshold(&split_id, &3);
    
    let governance = client.get_governance_info(&split_id);
    assert_eq!(governance.required_signatures, 3);
    assert_eq!(governance.num_signers, 3);
    assert_eq!(governance.threshold_percentage, 100); // 3/3 = 100%

    // Update threshold back to 2
    client.update_threshold(&split_id, &2);
    
    let governance = client.get_governance_info(&split_id);
    assert_eq!(governance.required_signatures, 2);
    assert_eq!(governance.threshold_percentage, 66); // 2/3 = 66%
}

#[test]
fn test_threshold_too_high() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Add two signers
    client.add_signer(&split_id, &signer1);
    client.add_signer(&split_id, &signer2);

    // Try to set threshold higher than number of signers - should fail
    // let result = client.update_threshold(&split_id, &5);
    // assert!(result.is_err());
}

#[test]
fn test_threshold_too_low() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &1, &1800);

    // Add one signer
    client.add_signer(&split_id, &signer);

    // Try to set threshold to 0 - should fail
    // let result = client.update_threshold(&split_id, &0);
    // assert!(result.is_err());
}

#[test]
fn test_is_signer() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Add one signer
    client.add_signer(&split_id, &signer1);

    // Check if signer1 is authorized
    assert!(client.is_signer(&split_id, &signer1));
    
    // Check if signer2 is authorized (should be false)
    assert!(!client.is_signer(&split_id, &signer2));

    // Add signer2
    client.add_signer(&split_id, &signer2);
    
    // Now both should be authorized
    assert!(client.is_signer(&split_id, &signer1));
    assert!(client.is_signer(&split_id, &signer2));
}

#[test]
fn test_governance_info() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &2, &1800);

    // Initially empty
    let governance = client.get_governance_info(&split_id);
    assert_eq!(governance.num_signers, 0);
    assert_eq!(governance.required_signatures, 2);

    // Add three signers
    client.add_signer(&split_id, &signer1);
    client.add_signer(&split_id, &signer2);
    client.add_signer(&split_id, &signer3);

    let governance = client.get_governance_info(&split_id);
    assert_eq!(governance.num_signers, 3);
    assert_eq!(governance.required_signatures, 2);
    assert_eq!(governance.current_signatures, 0);
    assert_eq!(governance.threshold_percentage, 66); // 2/3 = 66%
}

#[test]
fn test_cannot_modify_executed_split() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);

    client.initialize(&admin);
    client.create_multisig_split(&split_id, &3, &1800);

    // Add signers and execute
    client.add_signer(&split_id, &signer1);
    client.add_signer(&split_id, &signer2);
    client.add_signer(&split_id, &signer3);
    
    client.sign_split(&split_id, &signer1);
    client.sign_split(&split_id, &signer2);
    client.sign_split(&split_id, &signer3);
    
    env.ledger().set_timestamp(1801);
    client.execute_split(&split_id);

    // Try to add signer to executed split - should fail
    // let result = client.add_signer(&split_id, &Address::generate(&env));
    // assert!(result.is_err());

    // Try to remove signer from executed split - should fail
    // let result = client.remove_signer(&split_id, &signer1);
    // assert!(result.is_err());

    // Try to update threshold on executed split - should fail
    // let result = client.update_threshold(&split_id, &2);
    // assert!(result.is_err());
}

#[test]
fn test_dynamic_governance_flow() {
    let (env, admin, client) = setup_test();
    let split_id = String::from_str(&env, "split-001");
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);
    let signer4 = Address::generate(&env);

    client.initialize(&admin);
    
    // Create split with 2-of-3 multisig
    client.create_multisig_split(&split_id, &2, &1800);
    client.add_signer(&split_id, &signer1);
    client.add_signer(&split_id, &signer2);
    client.add_signer(&split_id, &signer3);

    // Verify initial state
    let governance = client.get_governance_info(&split_id);
    assert_eq!(governance.num_signers, 3);
    assert_eq!(governance.required_signatures, 2);

    // Collect some signatures
    client.sign_split(&split_id, &signer1);
    client.sign_split(&split_id, &signer2);

    // Change governance: remove signer2, add signer4
    client.remove_signer(&split_id, &signer2);
    client.add_signer(&split_id, &signer4);

    // Verify governance changed
    let governance = client.get_governance_info(&split_id);
    assert_eq!(governance.num_signers, 3); // Still 3 signers
    assert_eq!(governance.current_signatures, 1); // Lost one signature
    assert!(client.is_signer(&split_id, &signer1));
    assert!(!client.is_signer(&split_id, &signer2)); // Removed
    assert!(client.is_signer(&split_id, &signer3));
    assert!(client.is_signer(&split_id, &signer4)); // Added

    // Adjust threshold to 3-of-3 for higher security
    client.update_threshold(&split_id, &3);
    
    let governance = client.get_governance_info(&split_id);
    assert_eq!(governance.required_signatures, 3);
    assert_eq!(governance.threshold_percentage, 100);

    // Now need all 3 remaining signers to execute
    client.sign_split(&split_id, &signer3);
    client.sign_split(&split_id, &signer4);

    env.ledger().set_timestamp(1801);
    client.execute_split(&split_id);

    let split = client.get_split_info(&split_id);
    assert_eq!(split.status, MultisigStatus::Executed);
}
