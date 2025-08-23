import * as anchor from "@coral-xyz/anchor";

import { createTokenMint, getRequiredATA, readKpJson } from "./utils";
import {
//   getMXEPublicKeyWithRetry,
  getProbs as getProbsHelper,
  createUserPosition as createUserPositionHelper,
  createMarket as createMarketHelper,
  sendPayment as sendPaymentHelper,
//   revealResult as revealResultHelper,
  buyShares as buySharesHelper,
  sellShares as sellSharesHelper,
  withdrawPayment as withdrawPaymentHelper,
  settleMarket as settleMarketHelper,
  claimRewards as claimRewardsHelper,
  getMXEPublicKeyWithRetry,
  fundAndCreateMarket,
  getUserPosition,
  getMarketData,
} from "./arcium_helper";

import { initCompDefs, setup, uploadCompDefsCircuits } from "./setup";
import { SetupData } from "./setup";
import { calculateCost, calculateSharesForAmount } from "./lmsr";


async function createMarket(
    setupData: SetupData,
    marketId: number
) {
    const liquidityParameter = 10;
    const options = ["Yes", "No"];
    const question = `$SOL to 500?`;

    console.log("Creating market", marketId, "with liquidity parameter", liquidityParameter);
    const sig = await fundAndCreateMarket(
        setupData.provider,
        setupData.program,
        setupData.clusterAccount,
        marketId,
        question,
        options,
        liquidityParameter,
        setupData.mint,
        setupData.wallet,
        setupData.ata
      );
    console.log("Market created: ", sig);
}

async function createUserPosition(
    setupData: SetupData,
    marketId: number,
    owner: anchor.web3.Keypair
) {
    console.log("Creating user position for market", marketId);
    const existingUserPosition = await getUserPosition(
        setupData.program,
        owner,
        marketId
    );
    if (existingUserPosition) {
        console.log("User position already exists");
        return;
    }

    console.log("user position does not exist");
    const sig = await createUserPositionHelper(
        setupData.provider,
        setupData.program,
        setupData.clusterAccount,
        marketId,
        owner
      );
    console.log("User position created: ", sig);
}

async function sendPayment() {
    const setupData = await setup();
    const {
        program,
        provider,
        wallet,
        mint,
    } = setupData;
    const marketId = 1;
    const paymentAmount = 5 * 1e6;
    const ata = await getRequiredATA(provider, wallet, mint, wallet, wallet, 0);
    console.log("ATA: ", ata.toBase58());
    const sig = await sendPaymentHelper(program, wallet, ata, mint, marketId, paymentAmount);
    console.log("Payment sent: ", sig);
}

async function calculateSharesAndBuy(
    setupData: SetupData,
    marketId: number,
    owner: anchor.web3.Keypair,
    vote: number,
    sharesToBuy: number
) {
    const userPosition = await getUserPosition(
        setupData.program,
        owner,
        marketId
    );
    if (!userPosition) {
        return;
    }

    


}



async function buyShares(setupData: SetupData) {
    const {
        program,
        provider,
        clusterAccount,
        cipher,
        cipherPublicKey,
        wallet,
        mint,
        awaitEvent,
    } = setupData;

    const marketId = 1;
    const sharesToBuy = 1 * 1e6;
    const vote = 0;
    const ata = await getRequiredATA(provider, wallet, mint, wallet, wallet, 0);

    const sig = await buySharesHelper(
        provider as anchor.AnchorProvider,
        program,
        clusterAccount,
        cipher,
        cipherPublicKey,
        wallet,
        marketId,
        vote,
        sharesToBuy,
        awaitEvent("buySharesEvent")
    );
    console.log("Shares bought: ", sig);
}

async function getMarketStats(
    setupData: SetupData,
    marketId: number
) {
    let voteStats = [0, 0];
    // const probsDataPromise =  getProbsHelper(
    //     setupData.provider as anchor.AnchorProvider,
    //     setupData.program,
    //     marketId,
    //     setupData.clusterAccount,
    //     setupData.awaitEvent("revealProbsEvent")
    // );
    const probsData = null;
    const marketDataPromise = getMarketData(
        setupData.program,
        marketId
    );
    const marketData = await marketDataPromise;
    // const [probsData, marketData] = await Promise.all([probsDataPromise, marketDataPromise]);

    if (probsData) {
        voteStats = [probsData.votes[0].toNumber(), probsData.votes[1].toNumber()];
    } else{
        voteStats = [marketData.votesRevealed[0].toNumber(), marketData.votesRevealed[1].toNumber()];
    }

    return {
        voteStats,
        liquidityParameter: marketData.liquidityParameter.toNumber(),
        tvl: marketData.tvl.toNumber(),
    };
}

async function buySharesInAmount(
    setupData: SetupData,
    marketId: number,
    vote: number,
    amount: number
) {
    const marketStats = await getMarketStats(setupData, marketId);
    const shares = calculateSharesForAmount(
        marketStats.liquidityParameter,
        marketStats.voteStats,
        vote,
        amount
    );
    console.log(`Buying for vote ${vote} in amount ${amount / 1e6} USDC will give approx ${shares / 1e6} shares`);
    
    try {
        const ata = await getRequiredATA(setupData.provider, setupData.wallet, setupData.mint, setupData.wallet, setupData.wallet, 0);
        const sig = await sendPaymentHelper(setupData.program, setupData.wallet, ata, setupData.mint, marketId, amount);
        console.log("Payment sent: ", sig);
    } catch (error) {
        console.log("Payment error: ", error);
    }

    try {
        const eventData = await buySharesHelper(
            setupData.provider as anchor.AnchorProvider,
            setupData.program,
            setupData.clusterAccount,
            setupData.cipher,
            setupData.cipherPublicKey,
            setupData.wallet,
            marketId,
            vote,
            shares,
            setupData.awaitEvent("buySharesEvent")
        );
        console.log("Shares bought: ", eventData);
    } catch (error) {
        console.log("Error buying shares: ", error);
    }
}

async function main() {
    const marketId = 1;
    const setupData = await setup();
    // await initCompDefs(setupData);    
    // await createMarket(setupData, marketId);

    // Frontend
    // await createUserPosition(setupData, marketId, setupData.wallet);
    // await calculateSharesAndBuy(setupData, marketId, setupData.wallet, 0, 3 * 1e6);
    // await buySharesInAmount(setupData, marketId, 1, 1 * 1e6);

    // const userPosition = await getUserPosition(setupData.program, setupData.wallet, marketId);
    // console.log("User position: ", userPosition);

    // const marketStats = await getMarketStats(setupData, marketId);
    // console.log("Market stats: ", marketStats);

    // const cost = calculateCost(10, [1000000, 0]);
    // console.log("Cost: ", cost / 1e6);

    // const shares = calculateSharesForAmount(10, [0, 0], 0, 100 * 1e6);
    // console.log("Shares: ", shares / 1e6);

    // await sendPayment();
    // await buyShares(setupData);
    // await revealProbs(setupData, marketId);

}

main();