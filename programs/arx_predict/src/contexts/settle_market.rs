use anchor_lang::prelude::*;

use crate::{states::MarketStatus, ErrorCode, MarketAccount};

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
   
    #[account(
        mut,
        seeds = [b"market", id.to_le_bytes().as_ref()],
        bump = market_acc.bump
    )]
    pub market_acc: Account<'info, MarketAccount>,
}

impl<'info> SettleMarket<'info> {
    pub fn settle_market(
        &mut self,
        _id: u32,
        winner: u8,
    ) -> Result<()> {
        require!(
            self.payer.key() == self.market_acc.authority,
            ErrorCode::InvalidAuthority
        );
        require!(self.market_acc.status == MarketStatus::Active, ErrorCode::MarketActive);

        // TODO: check expiration date

        self.market_acc.status = MarketStatus::Settled;
        self.market_acc.winning_outcome = winner;

        Ok(())
    }
} 