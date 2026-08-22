use crate::types::ReminderEscrow;
use soroban_sdk::{contracttype, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Reminder(u64),
}

pub fn get_escrow(env: &Env, split_id: &u64) -> Option<ReminderEscrow> {
    env.storage()
        .persistent()
        .get(&DataKey::Reminder(*split_id))
}

pub fn has_escrow(env: &Env, split_id: &u64) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Reminder(*split_id))
}

pub fn set_escrow(env: &Env, split_id: &u64, escrow: &ReminderEscrow) {
    let key = DataKey::Reminder(*split_id);
    env.storage().persistent().set(&key, escrow);
}
