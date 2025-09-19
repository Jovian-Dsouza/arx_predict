use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{callbacks::InitMarketStatsCallback, check_admin, constants::{LN_2_SCALED}, states::MarketStatus, ErrorCode, MarketAccount, SignerAccount, COMP_DEF_OFFSET_INIT_MARKET_STATS, ID, ID_CONST, MAX_OPTIONS};

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, Mint, TokenAccount}
};

#[queue_computation_accounts("init_market_stats", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, id: u32)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_MARKET_STATS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    /// Sign PDA account for Arcium computations
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(
        init,
        payer = payer,
        space = 8 + MarketAccount::INIT_SPACE,
        seeds = [b"market", id.to_le_bytes().as_ref()],
        bump,
    )]
    pub market_acc: Account<'info, MarketAccount>,

    #[account(
        mut,
        seeds = [b"vault", id.to_le_bytes().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mint::token_program = token_program
    )]
    pub mint: Account<'info, Mint>,
}

impl<'info> CreateMarket<'info> {
    pub fn create_market(
        &mut self,
        id: u32,
        question: String,
        options: [String; MAX_OPTIONS],
        liquidity_parameter: u64,
        nonce: u128,
        computation_offset: u64,
        bump: u8,
        sign_pda_account_bump: u8,
    ) -> Result<()> {
        // Validations
        require!(liquidity_parameter >= 10, ErrorCode::InvalidLiquidityParameter);
        require!(self.market_acc.status == MarketStatus::Inactive, ErrorCode::MarketInactive);
        require!(options.len() == MAX_OPTIONS, ErrorCode::InvalidNumOptions);
        require!(!question.is_empty(), ErrorCode::InvalidQuestion);
        check_admin!(self.payer.key());
        for option in &options {
            require!(!option.is_empty(), ErrorCode::EmptyOption);
        }
        
        //Market maker has paid  b*ln(MAX_OPTIONS)
        // Note: this assumes that fund_market and this is in the same instruction
        let expected_funding_amount = ((liquidity_parameter as u128 * LN_2_SCALED as u128) / 10u128.pow(16)) as u64;
        require!(self.vault.amount >= expected_funding_amount, ErrorCode::MarketNotFunded);

        self.market_acc.id = id;
        self.market_acc.question = question;
        self.market_acc.bump = bump;
        self.market_acc.authority = self.payer.key();
        self.market_acc.nonce = nonce;
        self.market_acc.options = options;
        self.market_acc.vote_state = [[0; 32]; MAX_OPTIONS];
        self.market_acc.probs = [[0; 32]; MAX_OPTIONS];
        self.market_acc.cost = [0; 32];
        self.market_acc.liquidity_parameter = liquidity_parameter;
        self.market_acc.status = MarketStatus::Active;
        self.market_acc.tvl = self.vault.amount;
        self.market_acc.probs_revealed = [0.0; MAX_OPTIONS];
        self.market_acc.mint = self.mint.key();
        self.market_acc.mint_decimals = self.mint.decimals;

        

        let args = vec![
            Argument::PlaintextU128(nonce),
            Argument::PlaintextU64(liquidity_parameter),
        ];
        // Set the bump for the sign_pda_account
        // Note: The bump will be handled by the Arcium program
        
        // Set the bump for the sign_pda_account
        self.sign_pda_account.bump = sign_pda_account_bump;
        
        // Calls init_market_stats
        queue_computation(
            self,
            computation_offset,
            args,
            None,
            vec![InitMarketStatsCallback::callback_ix(&[
                CallbackAccount {
                    pubkey: self.market_acc.key(),
                    is_writable: true,
                },
            ])],
        )?;

        Ok(())
    }
}