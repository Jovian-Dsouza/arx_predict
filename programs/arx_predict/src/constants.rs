use arcium_anchor::comp_def_offset;

pub const COMP_DEF_OFFSET_INIT_VOTE_STATS: u32 = comp_def_offset("init_vote_stats");
pub const COMP_DEF_OFFSET_VOTE: u32 = comp_def_offset("vote");
pub const COMP_DEF_OFFSET_REVEAL: u32 = comp_def_offset("reveal_result");

pub const MAX_OPTIONS: usize = 2;
pub const MAX_QUESTION_LENGTH: usize = 50;
pub const MAX_OPTION_LENGTH: usize = 20;