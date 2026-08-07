#!/usr/bin/env bash
set -euo pipefail
umask 077

cd "$(dirname "$0")/.."

readonly expected_revision="1fb8f30d218c4e8e7d0e29dc4cd2e8d4900d60a8"
readonly expected_rustc="rustc 1.95.0 (59807616e 2026-04-14)"
readonly expected_cargo="cargo 1.95.0 (f2d3ce0bd 2026-03-21)"
readonly source_input="${IMMORTAL_SOURCE_DIR:?set IMMORTAL_SOURCE_DIR to an exact Immortal checkout}"

if test ! -d "${source_input}" || test -L "${source_input}"; then
  echo "build-immortal-artifact: source must be a non-symlink directory" >&2
  exit 1
fi
readonly source_dir="$(cd "${source_input}" && pwd -P)"
if test "$(git -C "${source_dir}" rev-parse HEAD)" != "${expected_revision}"; then
  echo "build-immortal-artifact: Immortal source revision is not pinned" >&2
  exit 1
fi
if test "$(rustc --version)" != "${expected_rustc}" || \
  test "$(cargo --version)" != "${expected_cargo}"; then
  echo "build-immortal-artifact: Rust and Cargo 1.95.0 are required" >&2
  exit 1
fi

readonly rust_sysroot="$(rustc --print sysroot)"
readonly cargo_binary="$(command -v cargo)"
readonly cargo_home="$(cd "$(dirname "${cargo_binary}")/.." && pwd -P)"
readonly cargo_registry="${CARGO_HOME:-${cargo_home}}/registry"
if test ! -d "${cargo_registry}"; then
  echo "build-immortal-artifact: Cargo registry path is unavailable" >&2
  exit 1
fi

readonly remap_flags="--remap-path-prefix=${source_dir}=/src/immortal --remap-path-prefix=${rust_sysroot}=/rust-toolchain --remap-path-prefix=${cargo_registry}=/cargo/registry"
(
  cd "${source_dir}"
  RUSTFLAGS="${remap_flags}" \
    IMMORTAL_SOURCE_REVISION="${expected_revision}" \
    cargo build --locked --release -p immortal-client-web --target wasm32-unknown-unknown
)

cp "${source_dir}/target/wasm32-unknown-unknown/release/immortal_client_web.wasm" \
  public/immortal/immortal_client_web.wasm
chmod 0644 public/immortal/immortal_client_web.wasm
shasum -a 256 public/immortal/immortal_client_web.wasm
wc -c public/immortal/immortal_client_web.wasm
