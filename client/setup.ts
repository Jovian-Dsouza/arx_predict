import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArxPredict } from "../target/types/arx_predict";
import {
  awaitComputationFinalization,
  deserializeLE,
  getArciumEnv,
  getClusterAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getMempoolAccAddress,
  getMXEAccAddress,
  getMXEPublicKey,
  RescueCipher,
  uploadCircuit,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

import { createTokenMint, getRequiredATA, readKpJson } from "../client/utils";
import {
  //   getMXEPublicKeyWithRetry,
  getProbs,
  createUserPosition,
  createMarket as createMarketHelper,
  sendPayment,
  revealResult,
  buyShares,
  sellShares,
  withdrawPayment,
  settleMarket,
  claimRewards,
  getMXEPublicKeyWithRetry,
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
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
// @ts-ignore
import * as IDL from "../target/idl/arx_predict.json";

type SetupData = {
  connection: Connection;
  wallet: Keypair;
  provider: anchor.AnchorProvider;
  program: Program<ArxPredict>;
  clusterAccount: PublicKey;
  mint: PublicKey;
  mxePublicKey: Uint8Array;
  cipher: RescueCipher;
  cipherPublicKey: Uint8Array;
  cipherPrivateKey: Uint8Array;
  cipherSharedSecret: Uint8Array;
  awaitEvent: any;
};

export async function setup(): Promise<SetupData> {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  const wallet = readKpJson(`${os.homedir()}/.config/solana/id.json`);
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  const program = new Program(IDL as any, provider) as Program<ArxPredict>;
  const clusterOffset = 1116522165;
  const clusterAccount = getClusterAccAddress(clusterOffset);
  const mint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const mxePublicKey = await getMXEPublicKeyWithRetry(
    provider,
    program.programId
  );
  const cipherPrivateKey = x25519.utils.randomPrivateKey();
  const cipherPublicKey = x25519.getPublicKey(cipherPrivateKey);
  const cipherSharedSecret = x25519.getSharedSecret(
    cipherPrivateKey,
    mxePublicKey
  );
  const cipher = new RescueCipher(cipherSharedSecret);

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

  console.log("wallet: ", wallet.publicKey.toBase58());
  console.log("program: ", program.programId.toBase58());
  console.log("clusterAccount: ", clusterAccount.toBase58());
  console.log("mint: ", mint.toBase58());
  return {
    connection,
    wallet,
    provider,
    program,
    clusterAccount,
    mint,
    mxePublicKey,
    cipher,
    cipherPublicKey,
    cipherPrivateKey,
    cipherSharedSecret,
    awaitEvent,
  };
}

export async function initCompDefs(setupData: SetupData) {
  const { provider, program, wallet } = setupData;

  console.log("Initializing comp defs...");

  const initMarketStatsSig = await initMarketStatsCompDef(
    provider as anchor.AnchorProvider,
    program,
    wallet,
    false
  );
  console.log(
    "Market stats computation definition initialized: ",
    initMarketStatsSig
  );

  const initUserPositionSig = await initUserPositionCompDef(
    provider as anchor.AnchorProvider,
    program,
    wallet,
    false
  );
  console.log(
    "User position computation definition initialized: ",
    initUserPositionSig
  );

  const initRevealResultSig = await initRevealResultCompDef(
    provider as anchor.AnchorProvider,
    program,
    wallet,
    false
  );
  console.log(
    "Reveal result computation definition initialized: ",
    initRevealResultSig
  );

  const initRevealProbsSig = await initRevealProbsCompDef(
    provider as anchor.AnchorProvider,
    program,
    wallet,
    false
  );
  console.log(
    "Reveal probs computation definition initialized: ",
    initRevealProbsSig
  );

  const initBuySharesSig = await initBuySharesCompDef(
    provider as anchor.AnchorProvider,
    program,
    wallet,
    false
  );
  console.log(
    "Buy shares computation definition initialized: ",
    initBuySharesSig
  );

  const initSellSharesSig = await initSellSharesCompDef(
    provider as anchor.AnchorProvider,
    program,
    wallet,
    false
  );
  console.log(
    "Sell shares computation definition initialized: ",
    initSellSharesSig
  );

  const initClaimRewardsSig = await initClaimRewardsCompDef(
    provider as anchor.AnchorProvider,
    program,
    wallet,
    false
  );
  console.log(
    "Claim rewards computation definition initialized: ",
    initClaimRewardsSig
  );

  // logSuccess("User position computation definition initialized");
}

async function uploadCircutHelper(setupData: SetupData, circuitName: string) {
  const { provider, program } = setupData;

  console.log("Uploading circuit: ", circuitName);

  const rawCircuit = fs.readFileSync(`build/${circuitName}_testnet.arcis`);

  await uploadCircuit(
    provider as anchor.AnchorProvider,
    circuitName,
    program.programId,
    rawCircuit,
    true
  );
}

export async function uploadCompDefsCircuits(setupData: SetupData) {
  await uploadCircutHelper(setupData, "init_market_stats");
  await uploadCircutHelper(setupData, "init_user_position");
  await uploadCircutHelper(setupData, "reveal_result");
  await uploadCircutHelper(setupData, "reveal_probs");
  await uploadCircutHelper(setupData, "buy_shares");
  await uploadCircutHelper(setupData, "sell_shares");
  await uploadCircutHelper(setupData, "claim_rewards");
}
