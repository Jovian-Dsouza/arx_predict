use arcium_anchor::comp_def_offset;

pub const COMP_DEF_OFFSET_INIT_VOTE_STATS: u32 = comp_def_offset("init_vote_stats");
pub const COMP_DEF_OFFSET_INIT_USER_POSITION: u32 = comp_def_offset("init_user_position");
pub const COMP_DEF_OFFSET_VOTE: u32 = comp_def_offset("vote");
pub const COMP_DEF_OFFSET_REVEAL: u32 = comp_def_offset("reveal_result");

pub const MAX_OPTIONS: usize = 2;
pub const MAX_QUESTION_LENGTH: usize = 50;
pub const MAX_OPTION_LENGTH: usize = 20;

pub const MARKET_ACCOUNT_VOTE_STATS_OFFSET: u32 = 8 + 1 + 16; // 8 bytes (discriminator) + 1 byte (bump) + 16 bytes (nonce)
pub const MARKET_ACCOUNT_VOTE_STATS_LENGTH: u32 = 32 * MAX_OPTIONS as u32;
pub const MARKET_ACCOUNT_PROB_LENGTH: u32 = 32 * MAX_OPTIONS as u32;

pub const USER_POSITION_SHARES_OFFSET: u32 = 8 + 1 + 16; // 8 bytes (discriminator) + 1 byte (bump) + 16 bytes (nonce)
pub const USER_POSITION_SHARES_LENGTH: u32 = 32 * MAX_OPTIONS as u32;