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

    // Create token mint and associated token account
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
    console.log("Token mint: ", mint.toString());
    console.log("Owner ATA: ", ata.toString());

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    console.log("Initializing computation definitions");
    const initVoteStatsSig = await initMarketStatsCompDef(provider as anchor.AnchorProvider, program, owner, false);
    const initUserPositionSig = await initUserPositionCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    const initRRSig = await initRevealResultCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    const initRPSig = await initRevealProbsCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    const initBuySharesSig = await initBuySharesCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    const initSellSharesSig = await initSellSharesCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    const initClaimRewardsSig = await initClaimRewardsCompDef(
      provider as anchor.AnchorProvider,
      program,
      owner,
      false
    );
    console.log("Computation definitions initialized");

    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const options = ["Yes", "No", "Maybe", "Not Sure"];
    const question = `$SOL to 500?`;
    // Create multiple polls
    for (const POLL_ID of POLL_IDS) {
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
    }

    // Reveal probs for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const probs = await getProbs(
        provider as anchor.AnchorProvider,
        program,
        POLL_ID,
        arciumEnv.arciumClusterPubkey,
        awaitEvent("revealProbsEvent")
      );
    }

    for (const POLL_ID of POLL_IDS) {
      await createUserPosition(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        POLL_ID
      );
    }

    // Send payments for each poll
    for (const POLL_ID of POLL_IDS) {
      await sendPayment(program, owner, ata, mint, POLL_ID, 100 * 1e6);
    }

    // Cast votes for each poll with different outcomes
    const voteOutcomes = [0, 1, 0]; // Different outcomes for each poll

    for (const POLL_ID of POLL_IDS) {
      await buyShares(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        cipher,
        publicKey,
        owner.publicKey,
        POLL_ID,
        0,
        10,
        awaitEvent("buySharesEvent")
      );
    }
    // Reveal probs for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const probs = await getProbs(
        provider as anchor.AnchorProvider,
        program,
        POLL_ID,
        arciumEnv.arciumClusterPubkey,
        awaitEvent("revealProbsEvent")
      );
      console.log(`Probs for poll ${POLL_ID}:`, probs);
    }

    // Sell shares for each poll
    for (const POLL_ID of POLL_IDS) {
      await sellShares(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        cipher,
        publicKey,
        owner.publicKey,
        POLL_ID,
        0,
        5,
        awaitEvent("sellSharesEvent")
      );
    }
    // Reveal probs for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const probs = await getProbs(
        provider as anchor.AnchorProvider,
        program,
        POLL_ID,
        arciumEnv.arciumClusterPubkey,
        awaitEvent("revealProbsEvent")
      );
      console.log(`Probs for poll ${POLL_ID}:`, probs);
    }

    // Reveal results for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const expectedOutcome = voteOutcomes[i]; 

      const revealEventPromise = awaitEvent("revealResultEvent");
      const revealEvent = await revealResult(
        provider as anchor.AnchorProvider,
        program,
        POLL_ID,
        arciumEnv.arciumClusterPubkey,
        revealEventPromise
      );
      
      console.log(
        `Decrypted winner for poll ${POLL_ID} is `,
        revealEvent.output
      );
      expect(revealEvent.output).to.equal(expectedOutcome);
    }

    // Settle market
    await settleMarket(program, owner, 0, POLL_IDS[0]);

    // Claim rewards for each poll
    // for (const POLL_ID of POLL_IDS) {
      await claimRewards(
        provider as anchor.AnchorProvider,
        program,
        arciumEnv.arciumClusterPubkey,
        owner.publicKey,
        POLL_IDS[0],
        awaitEvent("claimRewardsEvent")
      );
    // }


    // Withdraw payments for each poll
    for (const POLL_ID of POLL_IDS) {
      await withdrawPayment(program, owner, ata, mint, POLL_ID, 1 * 1e6);
    }

  });

  
});
