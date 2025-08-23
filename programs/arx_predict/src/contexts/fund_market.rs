use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, TransferChecked, transfer_checked}
};

use crate::{check_mint, constants::ADMIN_KEY, errors::ErrorCode};

#[derive(Accounts)]
#[instruction(_id: u32)]
pub struct FundMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        init,
        seeds = [b"vault", _id.to_le_bytes().as_ref()],
        bump,
        payer=payer,
        token::mint = mint,
        token::authority = vault
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub ata: Account<'info, TokenAccount>,

    #[account(
        mint::token_program = token_program
    )]
    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> FundMarket<'info> {
    pub fn fund_market(
        &mut self,
        amount: u64
    ) -> Result<()> {
        check_mint!(self.mint.key());
        require!(self.payer.key() == ADMIN_KEY, ErrorCode::InvalidAuthority);
        let transfer_accounts = TransferChecked {
            from: self.ata.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.payer.to_account_info(),
        };
        transfer_checked(
            CpiContext::new(
                self.token_program.to_account_info(),
                transfer_accounts
            ),
            amount,
            self.mint.decimals
        )?;

        Ok(())
    }
} 