use crate::errors::Error;
use crate::storage;
use crate::types::DisputeResult;
use soroban_sdk::{vec, Address, Env, IntoVal, Symbol, Val};

/// Named settlement intents derived from a dispute outcome.
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum DisputeAction {
    /// Dispute upheld — reverse the escrow split (refund raiser).
    ReverseSplit,
    /// Dispute dismissed or tied — release funds to the original recipient.
    ReleaseFunds,
}

/// Map a `DisputeResult` to the concrete `DisputeAction` that should be
/// executed against the escrow contract.
///
/// Returns `Err(Error::NotFound)` only if an unrecognised variant is somehow
/// passed in (defensive; the enum is exhaustive in practice).
pub fn adapt_outcome(result: DisputeResult) -> Result<DisputeAction, Error> {
    match result {
        DisputeResult::UpheldForRaiser => Ok(DisputeAction::ReverseSplit),
        DisputeResult::DismissedForRaiser | DisputeResult::Tied => Ok(DisputeAction::ReleaseFunds),
    }
}

/// Execute the resolved `DisputeAction` against the escrow contract.
pub fn execute_action(
    env: &Env,
    action: DisputeAction,
    escrow_contract: &Address,
    escrow_split_id: u64,
) -> Result<(), Error> {
    if !storage::is_trusted_escrow_contract(env, escrow_contract) {
        return Err(Error::UntrustedEscrowContract);
    }

    let (sym, args) = match action {
        DisputeAction::ReverseSplit => {
            let sym = Symbol::new(env, "reverse_split");
            let args: soroban_sdk::Vec<Val> = vec![env, escrow_split_id.into_val(env)];
            (sym, args)
        }
        DisputeAction::ReleaseFunds => {
            let sym = Symbol::new(env, "release_funds");
            let args: soroban_sdk::Vec<Val> = vec![env, escrow_split_id.into_val(env)];
            (sym, args)
        }
    };

    match env.try_invoke_contract::<(), Error>(escrow_contract, &sym, args) {
        Ok(Ok(())) => Ok(()),
        Ok(Err(_)) | Err(_) => Err(Error::EscrowActionFailed),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upheld_maps_to_reverse() {
        assert_eq!(
            adapt_outcome(DisputeResult::UpheldForRaiser).unwrap(),
            DisputeAction::ReverseSplit
        );
    }

    #[test]
    fn dismissed_maps_to_release() {
        assert_eq!(
            adapt_outcome(DisputeResult::DismissedForRaiser).unwrap(),
            DisputeAction::ReleaseFunds
        );
    }

    #[test]
    fn tied_maps_to_release() {
        assert_eq!(
            adapt_outcome(DisputeResult::Tied).unwrap(),
            DisputeAction::ReleaseFunds
        );
    }
}
