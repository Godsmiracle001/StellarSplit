use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotFound = 1,
    AlreadyExists = 2,
    NotAuthorized = 3,
    AlreadyVoted = 4,
    DisputeClosed = 5,
    VotingPeriodActive = 6,
    VotingPeriodEnded = 7,
    InvalidReason = 8,
    SplitNotFound = 9,
    /// Resolver is not authorized to finalize escrow actions for this dispute.
    UnauthorizedResolver = 10,
    UntrustedEscrowContract = 11,
    EscrowActionFailed = 12,
}
