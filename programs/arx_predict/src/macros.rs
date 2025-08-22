#[macro_export]
macro_rules! conditional_circuit_source {
    ($circuit_name:expr) => {
        if $crate::constants::IS_DEVNET {
            Some(arcium_client::idl::arcium::types::CircuitSource::OffChain(
                arcium_client::idl::arcium::types::OffChainCircuitSource {
                    source: $circuit_name.to_string(),
                    hash: [0; 32], // Just use zeros for now - hash verification isn't enforced yet
                }
            ))
        } else {
            None
        }
    };
}