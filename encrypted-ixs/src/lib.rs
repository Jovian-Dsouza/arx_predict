use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct VoteStats {
        option0: u64,
        option1: u64,
    }

    pub struct UserVote {
        option: u8,
    }

    #[instruction]
    pub fn init_vote_stats(mxe: Mxe) -> Enc<Mxe, VoteStats> {
        let vote_stats = VoteStats { 
            option0: 0,
            option1: 0,
        };
        mxe.from_arcis(vote_stats)
    }

    #[instruction]
    pub fn vote(
        vote_ctxt: Enc<Shared, UserVote>,
        vote_stats_ctxt: Enc<Mxe, VoteStats>,
    ) -> (Enc<Mxe, VoteStats>, u64, [f64; 2]) {
        let user_vote = vote_ctxt.to_arcis();
        let mut vote_stats = vote_stats_ctxt.to_arcis();

        if user_vote.option == 0 {
            vote_stats.option0 += 1;
        } else if user_vote.option == 1 {
            vote_stats.option1 += 1;
        }

        let total_votes = vote_stats.option0 + vote_stats.option1;
        
        // LSM (Logistic Softmax) probability calculation
        let mut probabilities = [0.5; 2];
        
        if total_votes > 0 {
            // Convert vote counts to logits (log-odds)
            let logit0 = (vote_stats.option0 as f64 + 1.0).ln(); // Add 1 for smoothing
            let logit1 = (vote_stats.option1 as f64 + 1.0).ln(); // Add 1 for smoothing
            
            // Apply softmax to get probabilities
            let max_logit = if logit0 > logit1 { logit0 } else { logit1 };
            let exp0 = (logit0 - max_logit).exp();
            let exp1 = (logit1 - max_logit).exp();
            let sum_exp = exp0 + exp1;
            
            probabilities[0] = exp0 / sum_exp;
            probabilities[1] = exp1 / sum_exp;
        } 
        
        (vote_stats_ctxt.owner.from_arcis(vote_stats), total_votes.reveal(), probabilities.reveal())
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

}
