use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, TransferChecked, transfer_checked}
};

use crate::{check_mint, states::UserPosition};
use crate::ErrorCode;

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct WithdrawPayment<'info> {
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

    #[account(
        mut,
        seeds = [b"user_position", id.to_le_bytes().as_ref(), payer.key().as_ref()],
        bump
    )]
    pub user_position_acc: Account<'info, UserPosition>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> WithdrawPayment<'info> {
    pub fn withdraw_payment(
        &mut self,
        amount: u64,
        id: u32, 
        bump: u8
    ) -> Result<()> {
        check_mint!(self.mint.key());
        require!(self.user_position_acc.balance >= amount, ErrorCode::InsufficientBalance);
        self.user_position_acc.balance -= amount;
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