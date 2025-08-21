use arcium_anchor::comp_def_offset;

pub const COMP_DEF_OFFSET_INIT_MARKET_STATS: u32 = comp_def_offset("init_market_stats");
pub const COMP_DEF_OFFSET_INIT_USER_POSITION: u32 = comp_def_offset("init_user_position");
pub const COMP_DEF_OFFSET_REVEAL: u32 = comp_def_offset("reveal_result");
pub const COMP_DEF_OFFSET_REVEAL_PROBS: u32 = comp_def_offset("reveal_probs");
pub const COMP_DEF_OFFSET_BUY_SHARES: u32 = comp_def_offset("buy_shares");
pub const COMP_DEF_OFFSET_SELL_SHARES: u32 = comp_def_offset("sell_shares");
pub const COMP_DEF_OFFSET_CLAIM_REWARDS: u32 = comp_def_offset("claim_rewards");

pub const MAX_OPTIONS: usize = 2;
pub const MAX_QUESTION_LENGTH: usize = 50;
pub const MAX_OPTION_LENGTH: usize = 20;

pub const MARKET_ACCOUNT_VOTE_STATS_OFFSET: u32 = 8 + 1 + 16; // 8 bytes (discriminator) + 1 byte (bump) + 16 bytes (nonce)
pub const MARKET_ACCOUNT_VOTE_STATS_LENGTH: u32 = 32 * MAX_OPTIONS as u32;
pub const MARKET_ACCOUNT_PROB_LENGTH: u32 = 32 * MAX_OPTIONS as u32;
pub const MARKET_ACCOUNT_COST_LENGTH: u32 = 32;

pub const USER_POSITION_SHARES_OFFSET: u32 = 8 + 1 + 16; // 8 bytes (discriminator) + 1 byte (bump) + 16 bytes (nonce)
pub const USER_POSITION_SHARES_LENGTH: u32 = 32 * MAX_OPTIONS as u32;

pub const MARKET_REVEAL_PROBS_TIME: u64 = 60;

pub const INIT_MARKET_STATS_CIRCUIT: &str = "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeidfwlmh2rlvitzdontolwpyyqwiuqrmmivn4j3pgjvqrutde4dtxa/init_market_stats_testnet.arcis";
pub const INIT_USER_POSITION_CIRCUIT: &str = "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeidfwlmh2rlvitzdontolwpyyqwiuqrmmivn4j3pgjvqrutde4dtxa/init_user_position_testnet.arcis";
pub const BUY_SHARES_CIRCUIT: &str = "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeidfwlmh2rlvitzdontolwpyyqwiuqrmmivn4j3pgjvqrutde4dtxa/buy_shares_testnet.arcis";
pub const CLAIM_REWARDS_CIRCUIT: &str = "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeidfwlmh2rlvitzdontolwpyyqwiuqrmmivn4j3pgjvqrutde4dtxa/claim_rewards_testnet.arcis";
pub const REVEAL_PROBS_CIRCUIT: &str = "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeidfwlmh2rlvitzdontolwpyyqwiuqrmmivn4j3pgjvqrutde4dtxa/reveal_probs_testnet.arcis";
pub const REVEAL_RESULT_CIRCUIT: &str = "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeidfwlmh2rlvitzdontolwpyyqwiuqrmmivn4j3pgjvqrutde4dtxa/reveal_result_testnet.arcis";
pub const SELL_SHARES_CIRCUIT: &str = "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeidfwlmh2rlvitzdontolwpyyqwiuqrmmivn4j3pgjvqrutde4dtxa/sell_shares_testnet.arcis";