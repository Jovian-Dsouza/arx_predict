import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ArxPredict } from "../target/types/arx_predict";
import { randomBytes } from "crypto";
import {
    awaitComputationFinalization,
    getArciumEnv,
    getCompDefAccOffset,
    getArciumAccountBaseSeed,
    getArciumProgAddress,
    uploadCircuit,
    buildFinalizeCompDefTx,
    RescueCipher,
    deserializeLE,
    getMXEAccAddress,
    getMempoolAccAddress,
    getCompDefAccAddress,
    getExecutingPoolAccAddress,
    x25519,
    getComputationAccAddress,
    getMXEPublicKey,
  } from "@arcium-hq/client";

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
  
  export async function getProbs(
    provider: anchor.AnchorProvider,
    program: Program<ArxPredict>, 
    marketId: number,
    arciumClusterPubkey: PublicKey,
    revealProbsEventPromise: any
  ) {
    const revealComputationOffset = new anchor.BN(randomBytes(8), "hex");
    const revealQueueSig = await program.methods
      .revealProbs(revealComputationOffset, marketId)
      .accountsPartial({
        computationAccount: getComputationAccAddress(
          program.programId,
          revealComputationOffset
        ),
        clusterAccount: arciumClusterPubkey,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(program.programId),
        executingPool: getExecutingPoolAccAddress(program.programId),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("reveal_probs")).readUInt32LE()
        ),
      })
      .rpc({ commitment: "confirmed" });
    console.log(`Reveal queue for poll ${marketId} sig is `, revealQueueSig);
  
    const revealFinalizeSig = await awaitComputationFinalization(
      provider as anchor.AnchorProvider,
      revealComputationOffset,
      program.programId,
      "confirmed"
    );
    console.log(
      `Reveal finalize for poll ${marketId} sig is `,
      revealFinalizeSig
    );
  
    const revealProbsEvent = await revealProbsEventPromise;
    console.log(
      `Decrypted probs for poll ${marketId} is `,
      revealProbsEvent.share0,
      revealProbsEvent.share1
    );
  }