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
} from "./arcium_helper";

import { initCompDefs, setup, uploadCompDefsCircuits } from "./setup";
import { SetupData } from "./setup";


async function createMarket(
    setupData: SetupData
) {
    const marketId = 1;
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
    if (!existingUserPosition) {
        return;
    }

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



async function buyShares() {
    const setupData = await setup();
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
    const sharesToBuy = 3;
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

async function revealProbs() {
    const setupData = await setup();
    const {
        program,
        provider,
        clusterAccount,
        awaitEvent,
    } = setupData;

    const marketId = 1;
    const probs = await getProbsHelper(
        provider as anchor.AnchorProvider,
        program,
        marketId,
        clusterAccount,
        awaitEvent("revealProbsEvent")
    );
    console.log("Probs: ", probs);
}

async function main() {
    const marketId = 1;
    const setupData = await setup();
    // await initCompDefs(setupData);    
    // await createMarket(setupData);

    // Frontend
    // await createUserPosition(setupData, marketId, setupData.wallet);
    await calculateSharesAndBuy(setupData, marketId, setupData.wallet, 0, 3 * 1e6);
    // await sendPayment();
    // await buyShares();
    // await revealProbs();

}

main();