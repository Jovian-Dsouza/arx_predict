use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct VoteStats {
        option0: u64,
        option1: u64,
    }

    pub struct Probs {
        share0: f64,
        share1: f64,
    }

    pub struct MarketStats {
        vote_stats: VoteStats,
        probs: Probs
    }

    pub struct UserPosition {
        share0: u64,
        share1: u64,
    }

    pub struct UserVote {
        option: u8,
    }

    #[instruction]
    pub fn init_vote_stats(mxe: Mxe) -> Enc<Mxe, MarketStats> {
        let vote_stats = VoteStats { 
            option0: 0,
            option1: 0,
        };
        let probs = Probs {
            share0: 0.5,
            share1: 0.5,
        };
        let market_stats = MarketStats {
            vote_stats,
            probs,
        };
        mxe.from_arcis(market_stats)
    }

    #[instruction]
    pub fn init_user_position(mxe: Mxe) -> Enc<Mxe, UserPosition> {
        let user_position = UserPosition { 
            share0: 0,
            share1: 0,
        };
        mxe.from_arcis(user_position)
    }

    #[instruction]
    pub fn vote(
        vote_ctxt: Enc<Shared, UserVote>,
        market_stats_ctxt: Enc<Mxe, MarketStats>,
        user_position_ctxt: Enc<Mxe, UserPosition>,
    ) -> (
        Enc<Mxe, MarketStats>, 
        Enc<Mxe, UserPosition>, 
        u64
    ) {
        let user_vote = vote_ctxt.to_arcis();
        let mut market_stats = market_stats_ctxt.to_arcis();
        let mut user_position = user_position_ctxt.to_arcis();

        if user_vote.option == 0 {
            market_stats.vote_stats.option0 += 1;
        } else if user_vote.option == 1 {
            market_stats.vote_stats.option1 += 1;
        }

        let total_votes = market_stats.vote_stats.option0 + market_stats.vote_stats.option1;
        
        if total_votes > 0 {
            // Convert vote counts to logits (log-odds)
            let logit0 = (market_stats.vote_stats.option0 as f64 + 1.0).ln(); // Add 1 for smoothing
            let logit1 = (market_stats.vote_stats.option1 as f64 + 1.0).ln(); // Add 1 for smoothing
            
            // Apply softmax to get probabilities
            let max_logit = if logit0 > logit1 { logit0 } else { logit1 };
            let exp0 = (logit0 - max_logit).exp();
            let exp1 = (logit1 - max_logit).exp();
            let sum_exp = exp0 + exp1;
            

            market_stats.probs.share0 = exp0 / sum_exp;
            market_stats.probs.share1 = exp1 / sum_exp;
        } 
        
        (
            market_stats_ctxt.owner.from_arcis(market_stats), 
            user_position_ctxt.owner.from_arcis(user_position),
            total_votes.reveal(),
        )
    }

    #[instruction]
    pub fn reveal_result(vote_stats_ctxt: Enc<Mxe, VoteStats>) -> u8 {
        let vote_stats = vote_stats_ctxt.to_arcis();
        let mut ans = 0;
        if vote_stats.option0 > vote_stats.option1 {
            ans = 0;
        } else {
            ans = 1;
        }

        ans.reveal()
    }

    #[instruction]
    pub fn reveal_probs(probs_ctxt: Enc<Mxe, MarketStats>) -> [f64; 2] {
        let probs = probs_ctxt.to_arcis();
        let probabilities = [probs.probs.share0.reveal(), probs.probs.share1.reveal()];
        probabilities
    }

}
