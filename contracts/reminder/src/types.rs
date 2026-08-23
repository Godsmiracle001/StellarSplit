use soroban_sdk::{contracttype, Address, Vec};

#[contracttype]
#[derive(Clone, Debug)]
pub struct EscrowParticipant {
    pub address: Address,
    pub amount_owed: i128,
    pub amount_paid: i128,
    pub paid_at: Option<u64>,
    pub reminder_requested: bool,
}

impl EscrowParticipant {
    pub fn new(address: Address, amount_owed: i128) -> Self {
        Self {
            address,
            amount_owed,
            amount_paid: 0,
            paid_at: None,
            reminder_requested: false,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ReminderEscrow {
    pub creator: Address,
    pub split_escrow_contract: Address,
    pub split_id: u64,
    pub participants: Vec<EscrowParticipant>,
}
