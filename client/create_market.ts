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
import { Connection, PublicKey } from "@solana/web3.js";
// @ts-ignore
import * as IDL from "../target/idl/arx_predict.json";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const wallet = readKpJson(`${os.homedir()}/.config/solana/id.json`);
const anchorProvider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(wallet),
  { commitment: "confirmed" }
);
const program = new Program(IDL as any, anchorProvider) as Program<ArxPredict>;
const clusterOffset = 1116522165;
const clusterAccount = getClusterAccAddress(clusterOffset);
const mint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export async function getMXEPublicKeyWithRetry(
    provider: anchor.AnchorProvider,
    programId: PublicKey,
    maxRetries: number = 10,
    retryDelayMs: number = 500
  ): Promise<Uint8Array> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const mxePublicKey = await getMXEPublicKey(provider, programId);
        if (mxePublicKey) {
          return mxePublicKey;
        }
      } catch (error) {
        console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
      }
  
      if (attempt < maxRetries) {
        console.log(
          `Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  
    throw new Error(
      `Failed to fetch MXE public key after ${maxRetries} attempts`
    );
  }

async function createMarket() {
    const mxePublicKey = await getMXEPublicKeyWithRetry(
        anchorProvider,
        program.programId
    );

    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const marketId = 1;
    const liquidityParameter = 10;
    const options = ["Yes", "No"];
    const question = `$SOL to 500?`;

    
    await createMarketHelper(
        anchorProvider,
        program,
        clusterAccount,
        marketId,
        question,
        options,
        liquidityParameter,
        mint
      );
}

async function main() {

    console.log("wallet: ", wallet.publicKey.toBase58());
    console.log("program: ", program.programId.toBase58());
    console.log("clusterAccount: ", clusterAccount.toBase58());
    console.log("mint: ", mint.toBase58());
    
    // await createMarket();

}

main();