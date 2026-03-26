#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Supported contracts: all crates that compile cleanly under the pinned Soroban toolchain.
#
# Excluded (broken):
# - dispute-resolution: many compilation errors (mid-port to pinned Soroban toolchain)
# - split-escrow: many compilation errors (draft/broken source)
# - multi-sig-splits: E0507 move error (needs ownership fix)
SUPPORTED_CONTRACTS=(
  "achievement-badges"
  "flash-loan"
  "path-payment"
  "split-template"
  "staking"
)

COMMAND="${1:-all}"

run_for_contract() {
  local contract="$1"
  local manifest="$CONTRACTS_DIR/$contract/Cargo.toml"

  echo ""
  echo "==> $COMMAND :: $contract"

  case "$COMMAND" in
    fmt)
      cargo fmt --manifest-path "$manifest" --all -- --check
      ;;
    test)
      cargo test --manifest-path "$manifest"
      ;;
    build)
      cargo build --manifest-path "$manifest" --target wasm32-unknown-unknown --release
      ;;
    *)
      echo "Unsupported command: $COMMAND (expected fmt, test, build, or all)"
      echo "Usage: bash ./scripts/ci-contracts.sh [fmt|test|build|all]"
      exit 1
      ;;
  esac
}

if [ "$COMMAND" = "all" ]; then
  # Run fmt, test, and build sequentially for all supported contracts
  for step in fmt test build; do
    COMMAND="$step"
    for contract in "${SUPPORTED_CONTRACTS[@]}"; do
      run_for_contract "$contract"
    done
  done
  COMMAND="all"
else
  for contract in "${SUPPORTED_CONTRACTS[@]}"; do
    run_for_contract "$contract"
  done
fi

echo ""
echo "All contract checks completed for: ${SUPPORTED_CONTRACTS[*]}"
