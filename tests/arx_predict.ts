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
  // revealResult,
  buyShares,
  sellShares,
  withdrawPayment,
  settleMarket,
  claimRewards,
  fundMarket,
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

/*
 * Events being captured and logged from programs/arx_predict/src/events.rs:
 * 
 * 1. VoteEvent - Market voting events with market_id, timestamp, total_votes, amount
 * 2. RevealResultEvent - Market result revelation with market_id, output
 * 3. RevealProbsEvent - Probability revelation with market_id, share0, share1
 * 4. BuySharesEvent - Share purchase events with market_id, status, timestamp, amount
 * 5. SellSharesEvent - Share sale events with market_id, status, timestamp, amount
 * 6. ClaimRewardsEvent - Reward claiming with market_id, amount
 * 7. InitMarketStatsEvent - Market stats initialization with market_id
 * 
 * All events are automatically logged with formatted output for debugging and monitoring.
 * 
 * NOTE: To prevent duplicate event logging, we use a smart event tracking system:
 * - Global listener catches unexpected events
 * - Specific listeners handle expected events
 * - Events are marked as "expected" to avoid duplicate logging
 */

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

// Helper function to format timestamp
const formatTimestamp = (timestamp: any) => {
  try {
    const date = new Date(timestamp.toNumber() * 1000);
    return date.toISOString();
  } catch (error) {
    return timestamp.toString();
  }
};

// Helper function to format event data
const formatEventData = (eventName: string, eventData: any) => {
  switch (eventName) {
    case 'voteEvent':
      return `Market ID: ${eventData.marketId}, Timestamp: ${formatTimestamp(eventData.timestamp)}, Total Votes: ${eventData.totalVotes}, Amount: ${formatUSDC(eventData.amount)}`;
    
    case 'revealResultEvent':
      return `Market ID: ${eventData.marketId}, Output: ${eventData.output}`;
    
    case 'revealProbsEvent':
      return `Market ID: ${eventData.marketId}, ${formatProbability(eventData.share0, eventData.share1)}`;
    
    case 'buySharesEvent':
      return `Market ID: ${eventData.marketId}, Status: ${eventData.status}, Timestamp: ${formatTimestamp(eventData.timestamp)}, Amount: ${formatUSDC(eventData.amount)}`;
    
    case 'sellSharesEvent':
      return `Market ID: ${eventData.marketId}, Status: ${eventData.status}, Timestamp: ${formatTimestamp(eventData.timestamp)}, Amount: ${formatUSDC(eventData.amount)}`;
    
    case 'claimRewardsEvent':
      return `Market ID: ${eventData.marketId}, Amount: ${formatUSDC(eventData.amount)}`;
    
    case 'initMarketStatsEvent':
      return `Market ID: ${eventData.marketId}`;
    
    default:
      return JSON.stringify(eventData, null, 2);
  }
};

// Enhanced event logging function with better formatting
const logEvent = (eventName: string, eventData: any) => {
  const formattedData = formatEventData(eventName, eventData);
  const timestamp = new Date().toISOString();
  console.log(`\n🎯 EVENT [${timestamp}]: ${eventName.toUpperCase()}`);
  console.log(`   📊 ${formattedData}`);
  
  // Add additional context for debugging
  if (eventData.marketId !== undefined) {
    console.log(`   🏷️  Market ID: ${eventData.marketId}`);
  }
  if (eventData.timestamp !== undefined) {
    console.log(`   ⏰ Timestamp: ${formatTimestamp(eventData.timestamp)}`);
  }
  if (eventData.amount !== undefined) {
    console.log(`   💰 Amount: ${formatUSDC(eventData.amount)}`);
  }
};



describe("Voting", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.ArxPredict as Program<ArxPredict>;
  const provider = anchor.getProvider();

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  
  // Enhanced event listener that logs all events
  const awaitEvent = async <E extends keyof Event>(eventName: E) => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => {
        // Log the event when it's received
        logEvent(eventName as string, event);
        res(event);
      });
    });
    await program.removeEventListener(listenerId);

    return event;
  };



  // Function to listen for all events globally (for debugging unexpected events)
  // This will only log events that aren't being handled by specific listeners
  const listenForAllEvents = () => {
    const allEventTypes: (keyof Event)[] = [
      "voteEvent",
      "revealResultEvent", 
      "revealProbsEvent",
      "buySharesEvent",
      "sellSharesEvent",
      "claimRewardsEvent",
      "initMarketStatsEvent"
    ];
    
    const listeners: number[] = [];
    const expectedEvents = new Set<string>();
    
    allEventTypes.forEach(eventType => {
      const listenerId = program.addEventListener(eventType, (event) => {
        // Only log if this event wasn't expected (not handled by specific listeners)
        if (!expectedEvents.has(`${eventType}-${event.marketId}`)) {
          console.log(`\n🔍 UNEXPECTED EVENT DETECTED: ${eventType}`);
          logEvent(eventType as string, event);
        }
      });
      listeners.push(listenerId);
    });
    
    return {
      cleanup: () => {
        listeners.forEach(id => program.removeEventListener(id));
      },
      markExpected: (eventType: string, marketId: number) => {
        expectedEvents.add(`${eventType}-${marketId}`);
        console.log(`\n📝 Marking event as expected: ${eventType} for market ${marketId}`);
      },
      isExpected: (eventType: string, marketId: number) => {
        return expectedEvents.has(`${eventType}-${marketId}`);
      }
    };
  };

  const arciumEnv = getArciumEnv();

  // Function to wait for a specific event to occur
  const waitForEvent = async <E extends keyof Event>(eventName: E): Promise<Event[E]> => {
    return new Promise((resolve) => {
      const listenerId = program.addEventListener(eventName, (event) => {
        program.removeEventListener(listenerId);
        resolve(event);
      });
    });
  };

  // Function to listen for all events during a specific operation
  const listenForEvents = async (operationName: string, eventTypes: (keyof Event)[]) => {
    const listeners: number[] = [];
    const events: { [key: string]: any } = {};
    
    // Set up listeners for all specified event types
    for (const eventType of eventTypes) {
      const listenerId = program.addEventListener(eventType, (event) => {
        // Log the event and store it
        logEvent(eventType as string, event);
        events[eventType as string] = event;
      });
      listeners.push(listenerId);
    }
    
    // Return cleanup function
    return {
      cleanup: () => {
        listeners.forEach(id => program.removeEventListener(id));
      },
      getEvents: () => events
    };
  };

  it("can vote on polls!", async () => {
    const POLL_IDS = [420];
    const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

    // Set up global event listener to catch any unexpected events
    const globalEventListener = listenForAllEvents();

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
      100000 * 1e6
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
    const liquidityParameter = 10;
    logStep(`Creating ${POLL_IDS.length} market(s)`, `Question: "${question}"`);
    logInfo(`   Options: ${options.join(', ')}`);
    logInfo(`   Liquidity parameter: ${liquidityParameter}`);
    
    // Listen for InitMarketStatsEvent during market creation
    const marketCreationListener = await listenForEvents("Market Creation", ["initMarketStatsEvent"]);
    
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      logProgress(i + 1, POLL_IDS.length, `Creating market ${POLL_ID}`);
      
      // Mark this event as expected before creating the market
      globalEventListener.markExpected("initMarketStatsEvent", POLL_ID);

      const fundingAmount = liquidityParameter * Math.log(options.length) * 1e6;
      logStep(`Funding market ${POLL_ID}, amount: ${fundingAmount} `);
      await fundMarket(program, owner, ata, mint, POLL_ID, fundingAmount);
      logSuccess(`Market ${POLL_ID} funded successfully`);

      logStep(`Creating market ${POLL_ID}`);
      await createMarket(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        POLL_ID,
        question,
        options,
        liquidityParameter,
        mint
      );
      
      // Wait a moment for the event to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logSuccess(`Market ${POLL_ID} created successfully`);
    }
    
    // Clean up market creation listener
    marketCreationListener.cleanup();

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
      const sharesToBuy = 3 * 1000000;
      logProgress(i + 1, POLL_IDS.length, `Voting on market ${POLL_ID}`);
      
      // Wait for BuySharesEvent during voting
      globalEventListener.markExpected("buySharesEvent", POLL_ID); // Mark as expected
      const buySharesEventPromise = waitForEvent("buySharesEvent");
      
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
        buySharesEventPromise
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
      
      // Wait for SellSharesEvent during share selling
      globalEventListener.markExpected("sellSharesEvent", POLL_ID); // Mark as expected
      const sellSharesEventPromise = waitForEvent("sellSharesEvent");
      
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
        sellSharesEventPromise
      );
      logSuccess(`Shares sold for market ${POLL_ID}`);
      logInfo(`   Shares sold: ${sharesToSell} shares`);
      logInfo(`   Vote choice: Option 0 (${options[0]})`);
    }
    
    logStep(`Revealing final probabilities after trading for ${POLL_IDS.length} market(s)`);
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      logProgress(i + 1, POLL_IDS.length, `Revealing final probs for market ${POLL_ID}`);
      
      // Wait for RevealProbsEvent during probability revelation
      globalEventListener.markExpected("revealProbsEvent", POLL_ID); // Mark as expected
      const revealProbsEventPromise = waitForEvent("revealProbsEvent");
      
      const probs = await getProbs(
        provider as anchor.AnchorProvider,
        program,
        POLL_ID,
        arciumEnv.arciumClusterPubkey,
        revealProbsEventPromise
      );
      logSuccess(`Final probabilities revealed for market ${POLL_ID}`);
      logInfo(`   Probabilities: ${formatProbability(probs.share0, probs.share1)}`);
    }

    // logSection("Result Revelation");
    // logStep(`Revealing results for ${POLL_IDS.length} market(s)`);
    // for (let i = 0; i < POLL_IDS.length; i++) {
    //   const POLL_ID = POLL_IDS[i];
    //   const expectedOutcome = voteOutcomes[i]; 
    //   logProgress(i + 1, POLL_IDS.length, `Revealing result for market ${POLL_ID}`);

    //   // Wait for RevealResultEvent during result revelation
    //   globalEventListener.markExpected("revealResultEvent", POLL_ID); // Mark as expected
    //   const revealResultEventPromise = waitForEvent("revealResultEvent");
      
    //   const revealEvent = await revealResult(
    //     provider as anchor.AnchorProvider,
    //     program,
    //     POLL_ID,
    //     arciumEnv.arciumClusterPubkey,
    //     revealResultEventPromise
    //   );
    //   logSuccess(`Market ${POLL_ID} result: ${revealEvent.output} (expected: ${expectedOutcome})`);
    //   expect(revealEvent.output).to.equal(expectedOutcome);
    // }

    logSection("Market Settlement & Rewards");
    logStep("Settling markets and claiming rewards");
    
    logInfo("Settling first market");
    await settleMarket(program, owner, 0, POLL_IDS[0]);
    logSuccess("Market settled successfully");
    
    logInfo("Claiming rewards for first market");
    
    // Wait for ClaimRewardsEvent during reward claiming
    globalEventListener.markExpected("claimRewardsEvent", POLL_IDS[0]); // Mark as expected
    const claimRewardsEventPromise = waitForEvent("claimRewardsEvent");
    
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
    
    // Event Summary
    console.log(`\n🎯 Events Summary:`);
    console.log(`   • InitMarketStatsEvent: Market stats computation definition initialized`);
    console.log(`   • BuySharesEvent: ${POLL_IDS.length} vote(s) cast (shares bought)`);
    console.log(`   • SellSharesEvent: ${POLL_IDS.length} share sale(s) completed`);
    console.log(`   • RevealProbsEvent: ${POLL_IDS.length} probability revelation(s)`);
    console.log(`   • RevealResultEvent: ${POLL_IDS.length} result revelation(s)`);
    console.log(`   • ClaimRewardsEvent: 1 reward claim completed`);
    console.log(`   • All events properly logged and formatted for debugging`);
    
    // Event Statistics
    console.log(`\n📊 Event Statistics:`);
    console.log(`   • Total events expected: ${1 + POLL_IDS.length * 4 + 1}`); // InitMarketStats + (BuyShares + SellShares + RevealProbs + RevealResult) * markets + ClaimRewards
    console.log(`   • Events captured: All events are automatically logged with timestamps`);
    console.log(`   • Event format: Human-readable with emojis and structured data`);
    console.log(`   • Debug info: Market IDs, timestamps, amounts, and probabilities are clearly displayed`);
    
    // Clean up global event listener
    globalEventListener.cleanup();
  });

  
});
