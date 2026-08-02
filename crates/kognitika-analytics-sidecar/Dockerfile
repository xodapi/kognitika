FROM rust:1.88-bookworm AS build
WORKDIR /workspace
COPY crates/kognitika-core crates/kognitika-core
COPY crates/kognitika-analytics-sidecar crates/kognitika-analytics-sidecar
RUN cargo build --release --manifest-path crates/kognitika-analytics-sidecar/Cargo.toml

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 analytics
COPY --from=build /workspace/crates/kognitika-analytics-sidecar/target/release/kognitika-analytics-sidecar /usr/local/bin/kognitika-analytics-sidecar
USER analytics
ENV ANALYTICS_SIDECAR_ADDR=0.0.0.0:3010
CMD ["/usr/local/bin/kognitika-analytics-sidecar"]
