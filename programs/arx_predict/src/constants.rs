use anchor_lang::prelude::Pubkey;
use arcium_anchor::comp_def_offset;
use crate::define_circuit_urls;

pub const COMP_DEF_OFFSET_INIT_MARKET_STATS: u32 = comp_def_offset("init_market_stats");
pub const COMP_DEF_OFFSET_INIT_USER_POSITION: u32 = comp_def_offset("init_user_position");
pub const COMP_DEF_OFFSET_REVEAL_MARKET: u32 = comp_def_offset("reveal_market");
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


define_circuit_urls! {
    "https://sapphire-literary-rat-567.mypinata.cloud/ipfs/bafybeie446cnbkeimmjjo5n22uj45wbek2ul7ygyzhrqjhuwswkvvw2voy/";
    INIT_MARKET_STATS_CIRCUIT: "init_market_stats_testnet.arcis",
    INIT_USER_POSITION_CIRCUIT: "init_user_position_testnet.arcis",
    BUY_SHARES_CIRCUIT: "buy_shares_testnet.arcis",
    CLAIM_REWARDS_CIRCUIT: "claim_rewards_testnet.arcis", 
    REVEAL_PROBS_CIRCUIT: "reveal_probs_testnet.arcis",
    REVEAL_MARKET_CIRCUIT: "reveal_market_testnet.arcis",
    SELL_SHARES_CIRCUIT: "sell_shares_testnet.arcis"
}

pub const IS_DEVNET: bool = true;
pub const LN_2_SCALED: u64 = 693_147_180_559_9453; // ln(2) * 10^16
pub const USDC_MINT: Pubkey = Pubkey::from_str_const("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // USDC devnet mint
pub const ADMIN_KEY: Pubkey = Pubkey::from_str_const("9CtkxgXqNF3yvGr4u9jdVByyZknBH4SoqPgNpRbX2sjP"); // admin key