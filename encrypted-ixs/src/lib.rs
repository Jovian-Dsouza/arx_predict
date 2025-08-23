use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    const SHARES_PER_UNIT: u64 = 1000000;
    const SHARES_PER_UNIT_INV_F64: f64 = 1.0f64 / SHARES_PER_UNIT as f64;
    
    pub struct VoteStats {
        option0: u64,
        option1: u64,
    }

    pub struct Probs {
        option0: f64,
        option1: f64,
    }

    pub struct MarketStats {
        vote_stats: VoteStats,
        probs: Probs,
        cost: f64,
    }

    pub struct UserPosition {
        option0: u64,
        option1: u64,
    }

    pub struct UserVote {
        option: u8,
    }

    #[instruction]
    pub fn init_market_stats(mxe: Mxe, liquidity_parameter: u64) -> Enc<Mxe, MarketStats> {
        let vote_stats = VoteStats { 
            option0: 0,
            option1: 0,
        };
        let probs = Probs {
            option0: 0.5,
            option1: 0.5,
        };
        let cost = (liquidity_parameter as f64) * (2.0f64).ln(); //TODO fixed 2 as number of options is 2
        let market_stats = MarketStats {
            vote_stats,
            probs,
            cost,
        };
        mxe.from_arcis(market_stats)
    }

    #[instruction]
    pub fn init_user_position(mxe: Mxe) -> Enc<Mxe, UserPosition> {
        let user_position = UserPosition { 
            option0: 0,
            option1: 0,
        };
        mxe.from_arcis(user_position)
    }

    #[instruction]
    pub fn buy_shares(
        vote_ctxt: Enc<Shared, UserVote>,
        shares: u64,
        liquidity_parameter: u64,
        market_stats_ctxt: Enc<Mxe, MarketStats>,
        user_position_ctxt: Enc<Mxe, UserPosition>,
    ) -> (
        Enc<Mxe, MarketStats>, 
        Enc<Mxe, UserPosition>, 
        f64, // Amount to pay
    ) {
        let user_vote = vote_ctxt.to_arcis();
        let mut market_stats = market_stats_ctxt.to_arcis();
        let mut user_position = user_position_ctxt.to_arcis();

        if user_vote.option == 0 {
            market_stats.vote_stats.option0 += shares;
            user_position.option0 += shares;
        } else if user_vote.option == 1 {
            market_stats.vote_stats.option1 += shares;
            user_position.option1 += shares;
        }

        let (probs, cost) = cal_prob(&market_stats.vote_stats, &liquidity_parameter);
        let amount = cost - market_stats.cost;
        market_stats.probs = probs;
        market_stats.cost = cost;

        (
            market_stats_ctxt.owner.from_arcis(market_stats), 
            user_position_ctxt.owner.from_arcis(user_position),
            amount.reveal()
        )
    }

    #[instruction]
    pub fn sell_shares(
        vote_ctxt: Enc<Shared, UserVote>,
        shares: u64,
        liquidity_parameter: u64,
        market_stats_ctxt: Enc<Mxe, MarketStats>,
        user_position_ctxt: Enc<Mxe, UserPosition>,
    ) -> (
        Enc<Mxe, MarketStats>, 
        Enc<Mxe, UserPosition>, 
        f64, // Amount to pay
        u8, // Status
    ) {
        let user_vote = vote_ctxt.to_arcis();
        let mut market_stats = market_stats_ctxt.to_arcis();
        let mut user_position = user_position_ctxt.to_arcis();
        let mut status: u8 = 1;

        if user_vote.option == 0 {
            if user_position.option0 < shares {
                status = 0;
            } else {
                market_stats.vote_stats.option0 -= shares;
                user_position.option0 -= shares;
            }
        } else if user_vote.option == 1 {
            if user_position.option1 < shares {
                status = 0;
            } else {
                market_stats.vote_stats.option1 -= shares;
                user_position.option1 -= shares;
            }
        }

        let mut amount = 0.0;
        // Only update stats if shares were actually sold
        if status == 1 {
            let (probs, cost) = cal_prob(&market_stats.vote_stats, &liquidity_parameter);
            amount = cost - market_stats.cost;
            market_stats.probs = probs;
            market_stats.cost = cost;
        }

        (
            market_stats_ctxt.owner.from_arcis(market_stats), 
            user_position_ctxt.owner.from_arcis(user_position),
            amount.reveal(),
            status.reveal(),
        )
    }


    fn cal_prob(vote_stats: &VoteStats, liquidity_parameter: &u64) -> (Probs, f64) {
        // let exp0 = (vote_stats.option0 as f64 / *liquidity_parameter as f64).exp();
        // let exp1 = (vote_stats.option1 as f64 / *liquidity_parameter as f64).exp();
        // let sum_exp = exp0 + exp1;

        let liquidity_inverse = 1.0f64 / *liquidity_parameter as f64;
        let x0 = ((vote_stats.option0 as f64) * SHARES_PER_UNIT_INV_F64) * liquidity_inverse;
        let x1 = ((vote_stats.option1 as f64) * SHARES_PER_UNIT_INV_F64) * liquidity_inverse;
        
        // Subtract max for numerical stability
        let max_x = x0.max(x1);
        let exp0 = (x0 - max_x).exp();
        let exp1 = (x1 - max_x).exp();
        let sum_exp = exp0 + exp1;

        (
            Probs {
                option0: exp0/sum_exp,
                option1: exp1/sum_exp,
            }, 
            (*liquidity_parameter as f64) * (sum_exp.ln() + max_x)
        )
    }

    #[instruction]
    pub fn reveal_probs(market_stats_ctxt: Enc<Mxe, MarketStats>) -> (
        [f64; 2], // probs
        [u64; 2], // vote stats
    ) {
        let market_stats = market_stats_ctxt.to_arcis();
        let probabilities = [market_stats.probs.option0.reveal(), market_stats.probs.option1.reveal()];
        let vote_stats = [market_stats.vote_stats.option0.reveal(), market_stats.vote_stats.option1.reveal()];
        (probabilities, vote_stats)
    }

    #[instruction]
    pub fn reveal_market(market_stats_ctxt: Enc<Mxe, MarketStats>, winner: u8) -> (
        u8, // winning outcome
        [f64; 2], // probs
        [u64; 2], // vote stats
    ) {
        let market_stats = market_stats_ctxt.to_arcis();
        let probs = [market_stats.probs.option0.reveal(), market_stats.probs.option1.reveal()];
        let vote_stats = [market_stats.vote_stats.option0.reveal(), market_stats.vote_stats.option1.reveal()];
        (winner.reveal(), probs, vote_stats)
    }

    #[instruction]
    pub fn claim_rewards(
        winning_outcome: u8,
        user_position_ctxt: Enc<Mxe, UserPosition>,
    ) -> (
        Enc<Mxe, UserPosition>, 
        u64, // Amount to claim
    ) {
        let mut user_position = user_position_ctxt.to_arcis();

        let mut reward: u64 = 0;
        if winning_outcome == 0 {
            reward = (user_position.option0 * (1000000u64)) / SHARES_PER_UNIT; //num shares * 1 token * 1e6 / shares_per_unit
        } else if winning_outcome == 1 {
            reward = (user_position.option1 * (1000000u64)) / SHARES_PER_UNIT; //num shares * 1 token * 1e6 / shares_per_unit
        }
        user_position.option0 = 0;
        user_position.option1 = 0;

        (
            user_position_ctxt.owner.from_arcis(user_position),
            reward.reveal()
        )
    }
}
