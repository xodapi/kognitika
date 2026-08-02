#[tokio::main]
async fn main() -> std::io::Result<()> {
    let address =
        std::env::var("ANALYTICS_SIDECAR_ADDR").unwrap_or_else(|_| "127.0.0.1:3010".to_owned());
    let listener = tokio::net::TcpListener::bind(&address).await?;
    kognitika_analytics_sidecar::serve(listener).await
}
