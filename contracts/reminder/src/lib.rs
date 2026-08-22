#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, Address, Env, IntoVal, Symbol, Val, Vec};

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

pub use events::*;
pub use storage::*;
pub use types::*;

#[contract]
pub struct ReminderContract;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyExists = 1,
    Unauthorized = 2,
}

fn get_split_creator(env: &Env, split_escrow_contract: &Address, split_id: u64) -> Address {
    let mut args = Vec::<Val>::new(env);
    args.push_back(split_id.into_val(env));

    env.invoke_contract(
        split_escrow_contract,
        &Symbol::new(env, "get_creator"),
        args,
    )
}

#[contractimpl]
impl ReminderContract {
    pub fn create_reminder_escrow(
        env: Env,
        creator: Address,
        split_escrow_contract: Address,
        split_id: u64,
        participants: Vec<EscrowParticipant>,
    ) -> Result<(), Error> {
        creator.require_auth();

        if get_split_creator(&env, &split_escrow_contract, split_id) != creator {
            return Err(Error::Unauthorized);
        }

        if storage::has_escrow(&env, &split_id) {
            return Err(Error::AlreadyExists);
        }

        let escrow = ReminderEscrow {
            creator,
            split_escrow_contract,
            split_id,
            participants,
        };
        storage::set_escrow(&env, &split_id, &escrow);
        Ok(())
    }

    pub fn request_reminder(env: Env, split_id: u64, participant: Address) {
        participant.require_auth();

        let mut escrow = storage::get_escrow(&env, &split_id).expect("Escrow not found");

        let mut found = false;
        let mut updated_participants = Vec::new(&env);

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant && p.amount_paid < p.amount_owed {
                p.reminder_requested = true;
                events::emit_reminder_requested(&env, participant.clone(), &split_id);
                found = true;
            }
            updated_participants.push_back(p);
        }

        if !found {
            panic!("Participant not found or already paid");
        }

        escrow.participants = updated_participants;
        storage::set_escrow(&env, &split_id, &escrow);
    }

    pub fn cancel_reminder(env: Env, split_id: u64, participant: Address) {
        participant.require_auth();

        let mut escrow = storage::get_escrow(&env, &split_id).expect("Escrow not found");

        let mut found = false;
        let mut updated_participants = Vec::new(&env);

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                p.reminder_requested = false;
                events::emit_reminder_cancelled(&env, participant.clone(), &split_id);
                found = true;
            }
            updated_participants.push_back(p);
        }

        if !found {
            panic!("Participant not found");
        }

        escrow.participants = updated_participants;
        storage::set_escrow(&env, &split_id, &escrow);
    }

    pub fn get_reminder_requested(env: Env, split_id: u64, participant: Address) -> bool {
        let escrow = storage::get_escrow(&env, &split_id).expect("Escrow not found");

        for i in 0..escrow.participants.len() {
            let p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                return p.reminder_requested;
            }
        }

        false
    }
}
