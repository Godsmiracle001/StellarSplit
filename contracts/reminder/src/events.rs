use soroban_sdk::{Address, Env, Symbol};

pub fn emit_reminder_requested(env: &Env, participant: Address, split_id: &u64) {
    env.events().publish(
        (Symbol::new(env, "ReminderRequested"), participant),
        *split_id,
    );
}

pub fn emit_reminder_cancelled(env: &Env, participant: Address, split_id: &u64) {
    env.events().publish(
        (Symbol::new(env, "ReminderCancelled"), participant),
        *split_id,
    );
}
