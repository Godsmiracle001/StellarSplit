# Multi-Signature Splits Contract

This Soroban smart contract implements multi-signature functionality with time-locks for large splits in the StellarSplit application.

## Overview

The contract enables secure handling of high-value splits by requiring multiple signatures and enforcing time delays before execution. This provides additional security layers for large transactions.

## Features

- **Multi-signature Requirements**: Configurable number of signatures needed
- **Time Locks**: Enforceable delays before execution
- **Signature Collection**: Track and validate participant approvals
- **Cancellation Mechanism**: Admin can cancel splits when necessary
- **Emergency Override**: Admin can execute splits immediately in emergencies

## Functions

### `initialize(env: Env, admin: Address)`

Initializes the contract with an admin address. Must be called before any other operations.

### `create_multisig_split(env: Env, creator: Address, split_id: String, required_sigs: u32, time_lock: u64) -> Result<(), MultisigError>`

Creates a new multi-signature split with the specified parameters. Requires
authorization from `creator`, who is recorded as the split's creator/initiator.
Since `split_id` is caller-supplied, creation against an existing ID is
rejected (`SplitAlreadyExists`) rather than silently overwriting it:
- `creator`: Address authorizing and initiating the split; recorded as its creator
- `split_id`: Unique identifier for the split
- `required_sigs`: Number of signatures required (minimum 1)
- `time_lock`: Time delay in seconds before execution is allowed

### `sign_split(env: Env, split_id: String, signer: Address) -> Result<bool, MultisigError>`

Allows a signer to add their signature to a split. Returns `true` if the split can now be executed.

### `execute_split(env: Env, split_id: String) -> Result<(), MultisigError>`

Executes a split once all required signatures are collected and the time lock has expired.

### `cancel_split(env: Env, split_id: String, reason: String) -> Result<(), MultisigError>`

Allows the admin to cancel a split with a reason. Only the admin can perform this action.

### `emergency_override(env: Env, split_id: String) -> Result<(), MultisigError>`

Allows the admin to execute a split immediately, bypassing signature and time lock requirements.

### `get_split_info(env: Env, split_id: String) -> MultisigSplit`

Returns detailed information about a split including current status and signatures.

### `can_execute_split(env: Env, split_id: String) -> bool`

Checks if a split can be executed (all signatures collected and time lock expired).

### `get_creator(env: Env, split_id: String) -> Result<Address, MultisigError>`

Returns the address recorded as the split's creator/initiator.

## Split States

- **Pending**: Created but no signatures yet
- **Active**: At least one signature collected
- **Executed**: Successfully executed
- **Cancelled**: Cancelled by admin
- **Expired**: Time lock expired without execution

## Error Types

- `SplitAlreadyExists`: Split ID already in use
- `SplitNotFound`: Split does not exist
- `InvalidThreshold`: Invalid signature threshold or time lock
- `AlreadySigned`: Signer has already signed this split
- `NotAuthorized`: Operation not authorized
- `TimeLockNotExpired`: Time lock has not expired yet
- `InsufficientSignatures`: Not enough signatures collected
- `SplitNotActive`: Split is not in active state
- `SplitAlreadyExecuted`: Split already executed or cancelled

## Building

```bash
cd contracts/multi-sig-splits
cargo build --target wasm32-unknown-unknown --release
```

## Testing

```bash
cd contracts/multi-sig-splits
cargo test
```

## Security Considerations

- `create_multisig_split` requires authorization from the `creator` address and records it, so every split has a verifiable, accountable owner
- Since split IDs are caller-supplied, creating a split against an ID that already exists is rejected rather than silently overwritten
- Only the admin can cancel splits or perform emergency overrides
- Time locks prevent rushed executions
- Duplicate signatures are prevented
- All state changes emit events for tracking

## Integration

This contract should be integrated with the main split escrow contract to provide enhanced security for high-value transactions. The split creation process should check transaction amounts and automatically use multi-sig for large values.