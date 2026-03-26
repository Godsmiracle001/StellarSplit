# StellarSplit Smart Contracts

This directory contains the Soroban smart contracts for the StellarSplit escrow system.

## Overview

The StellarSplit contracts handle on-chain escrow for bill splitting, enabling trustless payments between participants.

## Workspace

All healthy contracts are managed as a Cargo workspace from `contracts/Cargo.toml`.
Run workspace-wide commands from the `contracts/` directory:

```bash
cd contracts
cargo test --workspace        # run all tests
cargo fmt --all -- --check    # check formatting
cargo build --workspace --target wasm32-unknown-unknown --release  # build all WASMs
```

Or use the CI script:

```bash
bash scripts/ci-contracts.sh all    # fmt + test + build for all supported contracts
bash scripts/ci-contracts.sh fmt    # formatting only
bash scripts/ci-contracts.sh test   # tests only
bash scripts/ci-contracts.sh build  # WASM build only
```

## Contract Status

| Contract | Status | Tests | Notes |
|----------|--------|-------|-------|
| achievement-badges | Production | Yes | NFT achievement badges |
| flash-loan | Production | Yes | Flash loan protocol |
| path-payment | Production | Yes | Automatic currency conversion via Stellar path payments |
| split-template | Production | Yes | Reusable split templates with versioning |
| staking | Production | Yes | Staking, governance delegation, and reward distribution |
| dispute-resolution | Broken | - | Many compilation errors; mid-port to pinned Soroban toolchain |
| split-escrow | Broken | - | Many compilation errors; draft/broken source |
| multi-sig-splits | Broken | - | E0507 move error; needs ownership fix |

## Project Structure

```
contracts/
├── Cargo.toml                 # Workspace root (soroban-sdk centralized)
├── achievement-badges/        # NFT achievement badges
├── flash-loan/                # Flash loan protocol
├── path-payment/              # Path payment currency conversion
├── split-template/            # Reusable split templates (versioned)
├── staking/                   # Staking, governance & rewards
├── dispute-resolution/        # (excluded - broken)
├── split-escrow/              # (excluded - broken)
├── multi-sig-splits/          # (excluded - broken)
├── scripts/
│   └── ci-contracts.sh        # CI: fmt, test, build for supported contracts
└── README.md                  # This file
```

## Prerequisites

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. Add WebAssembly Target

```bash
rustup target add wasm32-unknown-unknown
```

### 3. Install Soroban CLI (Optional but Recommended)

```bash
cargo install soroban-cli
```

## Quick Start

### Build Contracts

```bash
cd contracts

# Build all workspace contracts to WASM
cargo build --workspace --target wasm32-unknown-unknown --release

# Or use the CI script
bash scripts/ci-contracts.sh build
```

### Run Tests

```bash
cd contracts

# Run all workspace tests
cargo test --workspace

# Run tests for a specific contract
cargo test -p staking-governance
cargo test -p split-template

# Or use the CI script
bash scripts/ci-contracts.sh test
```

### Deploy to Testnet

1. Set your admin secret key:
   ```bash
   export ADMIN_SECRET_KEY='S...your_secret_key...'
   ```

2. Deploy:
   ```bash
   ./scripts/deploy.sh testnet
   ```

3. Save the returned Contract ID for future interactions.

### Deploy to Mainnet

⚠️ **Warning**: Mainnet deployment uses real XLM!

```bash
./scripts/deploy.sh mainnet
```

## Network Configuration

| Network | RPC URL | Description |
|---------|---------|-------------|
| Testnet | https://soroban-testnet.stellar.org | Free test tokens available |
| Mainnet | https://soroban.stellar.org | Production environment |

### Getting Testnet Tokens

Use the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test) to fund a testnet account.

## Contract Functions

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Set up the contract with an admin |
| `create_split(...)` | Create a new bill split |
| `deposit(split_id, participant, amount)` | Deposit funds into a split |
| `release_funds(split_id)` | Release collected funds to creator |
| `cancel_split(split_id)` | Cancel a split |
| `get_split(split_id)` | Query split details |

## Events

The contract emits these events for off-chain tracking:

- `init` - Contract initialized
- `created` - Split created
- `deposit` - Funds deposited
- `released` - Funds released
- `cancel` - Split cancelled
- `refund` - Refund processed

## Development

### Project Layout

```
split-escrow/
├── Cargo.toml          # Dependencies and build config
└── src/
    ├── lib.rs          # Main contract + public interface
    ├── types.rs        # Split, Participant, SplitStatus
    ├── storage.rs      # DataKey enum + storage helpers
    ├── events.rs       # Event emission functions
    └── test.rs         # Unit tests
```

### Running Individual Tests

```bash
cd split-escrow
cargo test test_create_split
cargo test test_deposit -- --nocapture
```

### Checking for Warnings

```bash
cargo clippy --target wasm32-unknown-unknown
```

## Security Considerations

1. **Admin Keys**: Never commit secret keys to version control
2. **Authorization**: All sensitive operations require `require_auth()`
3. **Input Validation**: All inputs are validated before processing
4. **State Checks**: Operations verify split status before proceeding

## License

MIT License - see [LICENSE](../LICENSE) for details.
