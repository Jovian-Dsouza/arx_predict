use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct VoteStats {
        option0: u64,
        option1: u64,
        option2: u64,
        option3: u64
    }

    pub struct UserVote {
        option: u8,
    }

    #[instruction]
    pub fn init_vote_stats(mxe: Mxe) -> Enc<Mxe, VoteStats> {
        let vote_stats = VoteStats { 
            option0: 0,
            option1: 0,
            option2: 0,
            option3: 0
        };
        mxe.from_arcis(vote_stats)
    }

    #[instruction]
    pub fn vote(
        vote_ctxt: Enc<Shared, UserVote>,
        vote_stats_ctxt: Enc<Mxe, VoteStats>,
    ) -> (Enc<Mxe, VoteStats>, u64) {
        let user_vote = vote_ctxt.to_arcis();
        let mut vote_stats = vote_stats_ctxt.to_arcis();

        if user_vote.option == 0 {
            vote_stats.option0 += 1;
        } else if user_vote.option == 1 {
            vote_stats.option1 += 1;
        } else if user_vote.option == 2 {
            vote_stats.option2 += 1;
        } else if user_vote.option == 3 {
            vote_stats.option3 += 1;
        }

        let total_votes = vote_stats.option0 + vote_stats.option1 + vote_stats.option2 + vote_stats.option3;
        (vote_stats_ctxt.owner.from_arcis(vote_stats), total_votes.reveal())
    }

    #[instruction]
    pub fn reveal_result(vote_stats_ctxt: Enc<Mxe, VoteStats>) -> u8 {
        let vote_stats = vote_stats_ctxt.to_arcis();
        let mut max1 = 0;
        let mut max2 = 0;
        let mut max_idx1 = 0;
        let mut max_idx2 = 0;

        if vote_stats.option1 > vote_stats.option2 {
            max1 = vote_stats.option1;
            max_idx1 = 1;
        } else {
            max1 = vote_stats.option2;
            max_idx1 = 2;
        }

        if vote_stats.option3 > vote_stats.option0 {
            max2 = vote_stats.option3;
            max_idx2 = 3;
        } else {
            max2 = vote_stats.option0;
            max_idx2 = 0;
        }

        let max_idx = if max1 > max2 {
            max_idx1
        } else {
            max_idx2
        };

        max_idx.reveal()
    }
}
