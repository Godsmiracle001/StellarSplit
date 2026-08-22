#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _, LedgerInfo},
    Address, Env, String, Vec,
};

#[test]
fn test_reminder_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReminderContract);
    let client = ReminderContractClient::new(&env, &contract_id);

    let split_id = String::from_str(&env, "split_123");
    let participant_1 = Address::generate(&env);
    let participant_2 = Address::generate(&env);

    let mut participants = Vec::new(&env);
    participants.push_back(EscrowParticipant {
        address: participant_1.clone(),
        amount_owed: 100,
        amount_paid: 0,
        paid_at: None,
        reminder_requested: false,
    });
    participants.push_back(EscrowParticipant {
        address: participant_2.clone(),
        amount_owed: 200,
        amount_paid: 200,
        paid_at: Some(env.ledger().timestamp()),
        reminder_requested: false,
    });

    client.create_reminder_escrow(&split_id, &participants);

    // Initial state check
    assert!(!client.get_reminder_requested(&split_id, &participant_1));
    assert!(!client.get_reminder_requested(&split_id, &participant_2));

    // Request reminder for participant_1 (unpaid)
    client.request_reminder(&split_id, &participant_1);
    assert!(client.get_reminder_requested(&split_id, &participant_1));

    // Cancel reminder for participant_1
    client.cancel_reminder(&split_id, &participant_1);
    assert!(!client.get_reminder_requested(&split_id, &participant_1));
}

#[test]
fn test_reminder_escrow_ttl_is_extended_on_write() {
    let env = Env::default();
    env.ledger().set(LedgerInfo {
        timestamp: 0,
        protocol_version: 21,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 31_536_000,
    });

    let contract_id = env.register_contract(None, ReminderContract);
    let split_id = String::from_str(&env, "ttl_split");
    let participant = Address::generate(&env);
    let mut participants = Vec::new(&env);
    participants.push_back(EscrowParticipant {
        address: participant.clone(),
        amount_owed: 100,
        amount_paid: 0,
        paid_at: None,
        reminder_requested: false,
    });

    let escrow = ReminderEscrow {
        split_id: split_id.clone(),
        participants,
    };
    env.as_contract(&contract_id, || {
        env.storage().instance().extend_ttl(10, 1_000_000);
        storage::set_escrow(&env, &split_id, &escrow);
    });

    env.ledger().with_mut(|ledger| ledger.sequence_number += 11);

    let stored_escrow = env.as_contract(&contract_id, || {
        storage::get_escrow(&env, &split_id).expect("Escrow expired")
    });
    assert!(
        !stored_escrow
            .participants
            .get(0)
            .unwrap()
            .reminder_requested
    );
}

#[test]
#[should_panic(expected = "Participant not found or already paid")]
fn test_request_reminder_already_paid_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReminderContract);
    let client = ReminderContractClient::new(&env, &contract_id);

    let split_id = String::from_str(&env, "split_123");
    let participant = Address::generate(&env);

    let mut participants = Vec::new(&env);
    participants.push_back(EscrowParticipant {
        address: participant.clone(),
        amount_owed: 100,
        amount_paid: 100,
        paid_at: None,
        reminder_requested: false,
    });

    client.create_reminder_escrow(&split_id, &participants);
    client.request_reminder(&split_id, &participant);
}
