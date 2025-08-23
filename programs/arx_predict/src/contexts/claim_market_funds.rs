use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, TransferChecked, transfer_checked}
};

use crate::{states::{MarketAccount, MarketStatus}, ErrorCode};

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct ClaimMarketFunds<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", id.to_le_bytes().as_ref()],
        bump,
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

    /// CHECK: Poll authority pubkey
    #[account(
        address = market_acc.authority,
    )]
    pub authority: UncheckedAccount<'info>,
    #[account(
        seeds = [b"market", id.to_le_bytes().as_ref()],
        bump = market_acc.bump,
        has_one = authority
    )]
    pub market_acc: Account<'info, MarketAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ClaimMarketFunds<'info> {
    pub fn claim_market_funds(
        &mut self,
        id: u32, 
        bump: u8
    ) -> Result<()> {
        require!(self.market_acc.status == MarketStatus::Settled, ErrorCode::MarketNotSettled);
        require!(
            self.payer.key() == self.market_acc.authority,
            ErrorCode::InvalidAuthority
        );

        let winning_amount  = 10000; //TODO

        let amount = self.market_acc.tvl - winning_amount;
        require!(amount > 0, ErrorCode::InsufficientBalance);
        let transfer_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.ata.to_account_info(),
            authority: self.vault.to_account_info(),
        };
        let id_bytes = id.to_le_bytes();
        let signer: &[&[&[u8]]] = &[&[b"vault", id_bytes.as_ref(), &[bump]]];

        transfer_checked(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                transfer_accounts,
                signer
            ),
            amount,
            self.mint.decimals
        )
    }
} 