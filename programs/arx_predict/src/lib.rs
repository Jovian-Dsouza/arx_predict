use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

mod states;
mod constants;
mod errors;
mod contexts;

use states::*;
use constants::*;
use errors::*;
use contexts::*;

declare_id!("HUB6LrbuCgDeeAFK7R1jiuqAvzqDLussz3wqkQ5rWSvc");

#[arcium_program]
pub mod arx_predict {
    use super::*;

    pub fn init_vote_stats_comp_def(ctx: Context<InitVoteStatsCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_vote_comp_def(ctx: Context<InitVoteCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn init_reveal_result_comp_def(ctx: Context<InitRevealResultCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }
}
