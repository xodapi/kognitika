# kognitika-core

Pure Rust parity spike for Kognitika deterministic cognitive-analysis kernels.

This crate intentionally does not connect to React, Express, Prisma,
PostgreSQL, auth, storage, production runtime, WASM, or mobile bindings yet.
The TypeScript `AnalyzeSession` contract remains the source of truth until
Rust parity is proven on synthetic golden fixtures.

Run:

```bash
cargo test --manifest-path crates/kognitika-core/Cargo.toml
```

Next steps after parity:

1. Export shared JSON fixtures for TypeScript and Rust.
2. Add a WASM Worker benchmark behind the existing frame-budget contract.
3. Evaluate WASI/native-mobile bindings only after the same output contract is
   stable.
