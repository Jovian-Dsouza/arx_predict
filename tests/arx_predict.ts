import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArxPredict } from "../target/types/arx_predict";
import {
  awaitComputationFinalization,
  deserializeLE,
  getArciumEnv,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getMempoolAccAddress,
  getMXEAccAddress,
  RescueCipher,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

import { createTokenMint, getRequiredATA, readKpJson } from "../client/utils";
import {
  getMXEPublicKeyWithRetry,
  getProbs,
  createUserPosition,
  createMarket,
  sendPayment,
  revealResult,
  buyShares,
  sellShares,
  withdrawPayment,
  settleMarket,
  claimRewards,
} from "../client/arcium_helper";
import {
  initUserPositionCompDef,
  initRevealResultCompDef,
  initRevealProbsCompDef,
  initMarketStatsCompDef,
  initBuySharesCompDef,
  initSellSharesCompDef,
  initClaimRewardsCompDef,
} from "../client/init_comp_defs";
import { randomBytes } from "crypto";

// Utility function for pretty logging
const logSection = (title: string) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 ${title.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
};

const logStep = (step: string, details?: string) => {
  console.log(`\n📋 ${step}`);
  if (details) console.log(`   ${details}`);
};

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`);
};

const logInfo = (message: string) => {
  console.log(`ℹ️  ${message}`);
};

const logProgress = (current: number, total: number, action: string) => {
  const percentage = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
  console.log(`\n📊 Progress: [${bar}] ${percentage}% (${current}/${total})`);
  console.log(`   ${action}`);
};

// Helper function to format probability values
const formatProbability = (share0: any, share1: any) => {
  try {
    const share0Num = typeof share0 === 'string' ? parseFloat(share0) : share0.toNumber();
    const share1Num = typeof share1 === 'string' ? parseFloat(share1) : share1.toNumber();
    const total = share0Num + share1Num;
    const percentage0 = total > 0 ? ((share0Num / total) * 100).toFixed(2) : '0.00';
    const percentage1 = total > 0 ? ((share1Num / total) * 100).toFixed(2) : '0.00';
    return `Share0: ${share0Num} (${percentage0}%), Share1: ${share1Num} (${percentage1}%)`;
  } catch (error) {
    return `Share0: ${share0}, Share1: ${share1}`;
  }
};

// Helper function to format USDC amounts
const formatUSDC = (amount: number) => {
  return `${(amount / 1e6).toFixed(2)} USDC`;
};

describe("Voting", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.ArxPredict as Program<ArxPredict>;
  const provider = anchor.getProvider();

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(eventName: E) => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => {
        res(event);
      });
    });
    await program.removeEventListener(listenerId);

    return event;
  };

  const arciumEnv = getArciumEnv();

  it("can vote on polls!", async () => {
    const POLL_IDS = [420];
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    logSection("Initial Setup");
    
    logStep("Creating token mint and associated token account");
    const mint = await createTokenMint(
      provider as anchor.AnchorProvider,
      owner
    );
    const ata = await getRequiredATA(
      provider as anchor.AnchorProvider,
      owner,
      mint,
      1000 * 1e6
    );
    logSuccess(`Token mint: ${mint.toString()}`);
    logSuccess(`Owner ATA: ${ata.toString()}`);

    logStep("Fetching MXE public key");
    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );
    logSuccess(`MXE x25519 pubkey: ${mxePublicKey.toString()}`);

    logSection("Computation Definitions Initialization");
    logInfo("Initializing all required computation definitions...");
    
    const initVoteStatsSig = await initMarketStatsCompDef(provider as anchor.AnchorProvider, program, owner, false);
    logSuccess("Market stats computation definition initialized");
    
    const initUserPositionSig = await initUserPositionCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    logSuccess("User position computation definition initialized");
    
    const initRRSig = await initRevealResultCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    logSuccess("Reveal result computation definition initialized");
    
    const initRPSig = await initRevealProbsCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    logSuccess("Reveal probs computation definition initialized");
    
    const initBuySharesSig = await initBuySharesCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    logSuccess("Buy shares computation definition initialized");
    
    const initSellSharesSig = await initSellSharesCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    logSuccess("Sell shares computation definition initialized");
    
    const initClaimRewardsSig = await initClaimRewardsCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    logSuccess("Claim rewards computation definition initialized");

    logSection("Market Creation");
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const options = ["Yes", "No"];
    const question = `$SOL to 500?`;
    
    logStep(`Creating ${POLL_IDS.length} market(s)`, `Question: "${question}"`);
    logInfo(`   Options: ${options.join(', ')}`);
    logInfo(`   Liquidity parameter: 10`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      logProgress(i + 1, POLL_IDS.length, `Creating market ${POLL_ID}`);
      
      await createMarket(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        POLL_ID,
        question,
        options,
        10, // liquidity parameter
        mint
      );
      logSuccess(`Market ${POLL_ID} created successfully`);
    }

    // logSection("Probability Revelation");
    // logStep(`Revealing initial probabilities for ${POLL_IDS.length} market(s)`);
    // for (let i = 0; i < POLL_IDS.length; i++) {
    //   const POLL_ID = POLL_IDS[i];
    //   logProgress(i + 1, POLL_IDS.length, `Revealing probs for market ${POLL_ID}`);
      
    //   const probs = await getProbs(
    //     provider as anchor.AnchorProvider,
    //     program,
    //     POLL_ID,
    //     arciumEnv.arciumClusterPubkey,
    //     awaitEvent("revealProbsEvent")
    //   );
    //   logSuccess(`Market ${POLL_ID} probabilities revealed`);
    //   logInfo(`   Probabilities: ${formatProbability(probs.share0, probs.share1)}`);
    // }

    logSection("User Position Creation");
    logStep(`Creating user positions for ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      logProgress(i + 1, POLL_IDS.length, `Creating position for market ${POLL_ID}`);
      
      await createUserPosition(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        POLL_ID
      );
      logSuccess(`User position created for market ${POLL_ID}`);
    }

    logSection("Payment Processing");
    logStep(`Sending payments to ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const paymentAmount = 100 * 1e6;
      logProgress(i + 1, POLL_IDS.length, `Sending payment to market ${POLL_ID}`);
      
      await sendPayment(program, owner, ata, mint, POLL_ID, paymentAmount);
      logSuccess(`Payment sent to market ${POLL_ID}`);
      logInfo(`   Amount: ${formatUSDC(paymentAmount)}`);
    }

    logSection("Voting Process");
    const voteOutcomes = [0, 1, 0]; // Different outcomes for each poll
    
    logStep(`Casting votes (buying shares) for ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const sharesToBuy = 10;
      logProgress(i + 1, POLL_IDS.length, `Voting on market ${POLL_ID}`);
      
      await buyShares(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        cipher,
        publicKey,
        owner.publicKey,
        POLL_ID,
        0,
        sharesToBuy,
        awaitEvent("buySharesEvent")
      );
      logSuccess(`Vote cast for market ${POLL_ID}`);
      logInfo(`   Shares bought: ${sharesToBuy} shares`);
      logInfo(`   Vote choice: Option 0 (${options[0]})`);
    }
    
    // logStep(`Revealing updated probabilities after voting for ${POLL_IDS.length} market(s)`);
    // for (let i = 0; i < POLL_IDS.length; i++) {
    //   const POLL_ID = POLL_IDS[i];
    //   logProgress(i + 1, POLL_IDS.length, `Revealing probs for market ${POLL_ID}`);
      
    //   const probs = await getProbs(
    //     provider as anchor.AnchorProvider,
    //     program,
    //     POLL_ID,
    //     arciumEnv.arciumClusterPubkey,
    //     awaitEvent("revealProbsEvent")
    //   );
    //   logSuccess(`Updated probabilities revealed for market ${POLL_ID}`);
    //   logInfo(`   Probabilities: ${formatProbability(probs.share0, probs.share1)}`);
    // }

    logSection("Share Trading");
    logStep(`Selling shares for ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const sharesToSell = 5;
      logProgress(i + 1, POLL_IDS.length, `Selling shares for market ${POLL_ID}`);
      
      await sellShares(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        cipher,
        publicKey,
        owner.publicKey,
        POLL_ID,
        0,
        sharesToSell,
        awaitEvent("sellSharesEvent")
      );
      logSuccess(`Shares sold for market ${POLL_ID}`);
      logInfo(`   Shares sold: ${sharesToSell} shares`);
      logInfo(`   Vote choice: Option 0 (${options[0]})`);
    }
    
    logStep(`Revealing final probabilities after trading for ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      logProgress(i + 1, POLL_IDS.length, `Revealing final probs for market ${POLL_ID}`);
      
      const probs = await getProbs(
        provider as anchor.AnchorProvider,
        program,
        POLL_ID,
        arciumEnv.arciumClusterPubkey,
        awaitEvent("revealProbsEvent")
      );
      logSuccess(`Final probabilities revealed for market ${POLL_ID}`);
      logInfo(`   Probabilities: ${formatProbability(probs.share0, probs.share1)}`);
    }

    logSection("Result Revelation");
    logStep(`Revealing results for ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const expectedOutcome = voteOutcomes[i]; 
      logProgress(i + 1, POLL_IDS.length, `Revealing result for market ${POLL_ID}`);

      const revealEventPromise = awaitEvent("revealResultEvent");
      const revealEvent = await revealResult(
        provider as anchor.AnchorProvider,
        program,
        POLL_ID,
        arciumEnv.arciumClusterPubkey,
        revealEventPromise
      );
      
      logSuccess(`Market ${POLL_ID} result: ${revealEvent.output} (expected: ${expectedOutcome})`);
      expect(revealEvent.output).to.equal(expectedOutcome);
    }

    logSection("Market Settlement & Rewards");
    logStep("Settling markets and claiming rewards");
    
    logInfo("Settling first market");
    await settleMarket(program, owner, 0, POLL_IDS[0]);
    logSuccess("Market settled successfully");
    
    logInfo("Claiming rewards for first market");
    const claimRewardsEventPromise = awaitEvent("claimRewardsEvent");
    await claimRewards(
      provider as anchor.AnchorProvider,
      program,
      arciumEnv.arciumClusterPubkey,
      owner.publicKey,
      POLL_IDS[0],
      claimRewardsEventPromise
    );
    const claimRewardsEvent = await claimRewardsEventPromise;
    logSuccess("Rewards claimed successfully");
    logInfo(`   Reward amount: ${formatUSDC(claimRewardsEvent.amount.toNumber())}`);

    logSection("Payment Withdrawal");
    logStep(`Withdrawing payments from ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const withdrawalAmount = 1 * 1e6;
      logProgress(i + 1, POLL_IDS.length, `Withdrawing from market ${POLL_ID}`);
      
      await withdrawPayment(program, owner, ata, mint, POLL_ID, withdrawalAmount);
      logSuccess(`Payment withdrawn from market ${POLL_ID}`);
      logInfo(`   Amount: ${formatUSDC(withdrawalAmount)}`);
    }

    logSection("Test Completion");
    logSuccess("All voting operations completed successfully! 🎉");
    
    // Summary of operations
    console.log(`\n📈 Test Summary:`);
    console.log(`   • Markets created: ${POLL_IDS.length}`);
    console.log(`   • Total payment sent: ${formatUSDC(POLL_IDS.length * 100 * 1e6)}`);
    console.log(`   • Total shares bought: ${POLL_IDS.length * 10} shares`);
    console.log(`   • Total shares sold: ${POLL_IDS.length * 5} shares`);
    console.log(`   • Total payment withdrawn: ${formatUSDC(POLL_IDS.length * 1 * 1e6)}`);
    console.log(`   • Question tested: "${question}"`);
    console.log(`   • Options available: ${options.join(', ')}`);
  });

  
});
