#![cfg(test)]
use super::*;
use soroban_sdk::{
    contract,
    contracterror,
    contractimpl,
    contracttype,
    testutils::{Address as _, Ledger as _, LedgerInfo},
    Address,
    Env,
    String,
    Vec,
};

#[contract]
struct MockSplitEscrowContract;

#[contracttype]
enum MockSplitEscrowDataKey {
    Creator(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
enum MockSplitEscrowError {
    SplitNotFound = 1,
}

#[contractimpl]
impl MockSplitEscrowContract {
    pub fn set_creator(env: Env, split_id: u64, creator: Address) {
        env.storage()
            .persistent()
            .set(&MockSplitEscrowDataKey::Creator(split_id), &creator);
    }

    pub fn get_creator(env: Env, split_id: u64) -> Result<Address, MockSplitEscrowError> {
        env.storage()
            .persistent()
            .get(&MockSplitEscrowDataKey::Creator(split_id))
            .ok_or(MockSplitEscrowError::SplitNotFound)
    }
}

fn setup() -> (
    Env,
    ReminderContractClient<'static>,
    MockSplitEscrowContractClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();

    let reminder_contract_id = env.register_contract(None, ReminderContract);
    let reminder_client = ReminderContractClient::new(&env, &reminder_contract_id);

    let split_contract_id = env.register_contract(None, MockSplitEscrowContract);
    let split_client = MockSplitEscrowContractClient::new(&env, &split_contract_id);

    (env, reminder_client, split_client)
}

#[test]
fn test_reminder_flow() {
    let (env, client, split_client) = setup();

    let split_id = 123u64;
    let creator = Address::generate(&env);
    split_client.set_creator(&split_id, &creator);
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

    client.create_reminder_escrow(&creator, &split_client.address, &split_id, &participants);

    let escrow = env.as_contract(&client.address, || {
        storage::get_escrow(&env, &split_id).expect("escrow should be stored")
    });
    assert_eq!(escrow.creator, creator);
    assert_eq!(escrow.split_escrow_contract, split_client.address);

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
    let (env, client, split_client) = setup();

    let split_id = 123u64;
    let creator = Address::generate(&env);
    split_client.set_creator(&split_id, &creator);
    let participant = Address::generate(&env);

    let mut participants = Vec::new(&env);
    participants.push_back(EscrowParticipant {
        address: participant.clone(),
        amount_owed: 100,
        amount_paid: 100,
        paid_at: None,
        reminder_requested: false,
    });

    client.create_reminder_escrow(&creator, &split_client.address, &split_id, &participants);
    client.request_reminder(&split_id, &participant);
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn test_create_reminder_escrow_requires_creator_auth() {
    let env = Env::default();

    let contract_id = env.register_contract(None, ReminderContract);
    let client = ReminderContractClient::new(&env, &contract_id);
    let split_contract_id = env.register_contract(None, MockSplitEscrowContract);
    let split_client = MockSplitEscrowContractClient::new(&env, &split_contract_id);

    let creator = Address::generate(&env);
    let split_id = 123u64;
    let participants = Vec::new(&env);

    client.create_reminder_escrow(&creator, &split_client.address, &split_id, &participants);
}

#[test]
fn test_create_reminder_escrow_rejects_duplicate_split_id() {
    let (env, client, split_client) = setup();

    let creator = Address::generate(&env);
    let split_id = 123u64;
    split_client.set_creator(&split_id, &creator);
    let participant = Address::generate(&env);

    let mut participants = Vec::new(&env);
    participants.push_back(EscrowParticipant::new(participant.clone(), 100));

    client.create_reminder_escrow(&creator, &split_client.address, &split_id, &participants);

    let attacker = Address::generate(&env);
    let mut overwritten_participants = Vec::new(&env);
    overwritten_participants.push_back(EscrowParticipant::new(attacker, 999));

    assert_eq!(
        client.try_create_reminder_escrow(
            &creator,
            &split_client.address,
            &split_id,
            &overwritten_participants
        ),
        Err(Ok(Error::AlreadyExists))
    );

    assert!(!client.get_reminder_requested(&split_id, &participant));
}

#[test]
fn test_create_reminder_escrow_rejects_non_split_creator() {
    let (env, client, split_client) = setup();

    let split_creator = Address::generate(&env);
    let caller = Address::generate(&env);
    let split_id = 123u64;
    split_client.set_creator(&split_id, &split_creator);

    let participants = Vec::new(&env);

    assert_eq!(
        client.try_create_reminder_escrow(&caller, &split_client.address, &split_id, &participants),
        Err(Ok(Error::Unauthorized))
    );
}
