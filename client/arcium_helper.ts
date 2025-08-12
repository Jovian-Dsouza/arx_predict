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

export async function createUserPosition(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  arciumClusterPubkey: PublicKey,
  marketId: number
) {
  const userPositionNonce = randomBytes(16);

  const userPositionComputationOffset = new anchor.BN(randomBytes(8), "hex");

  const userPositionSig = await program.methods
    .createUserPosition(
      userPositionComputationOffset,
      marketId,
      new anchor.BN(deserializeLE(userPositionNonce).toString())
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(
        program.programId,
        userPositionComputationOffset
      ),
      clusterAccount: arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("init_user_position")).readUInt32LE()
      ),
    })
    .rpc();

  console.log(`User position created with signature`, userPositionSig);

  const finalizePollSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    userPositionComputationOffset,
    program.programId,
    "confirmed"
  );
  console.log(`Finalize user position sig is `, finalizePollSig);
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
  return revealProbsEvent;
}

export async function createMarket(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  arciumClusterPubkey: PublicKey,
  marketId: number,
  question: string,
  options: string[],
  liquidity_parameter: number,
  mint: PublicKey
) {
  const nonce = randomBytes(16);
  const pollComputationOffset = new anchor.BN(randomBytes(8), "hex");
  const pollSig = await program.methods
    .createMarket(
      pollComputationOffset,
      marketId,
      question,
      options,
      new anchor.BN(liquidity_parameter),
      new anchor.BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(
        program.programId,
        pollComputationOffset
      ),
      clusterAccount: arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("init_vote_stats")).readUInt32LE()
      ),
      mint: mint,
    })
    .rpc();

  console.log(`Market ${marketId} created with signature`, pollSig);

  const finalizePollSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    pollComputationOffset,
    program.programId,
    "confirmed"
  );
  console.log(`Finalize Market ${marketId} sig is `, finalizePollSig);
}

export async function sendPayment(
    program: Program<ArxPredict>,
    owner: anchor.web3.Keypair,
    ata: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    marketId: number,
    amount: number
  ) {
    console.log(`Sending payment of ${amount} to market ${marketId}`);
    const sig = await program.methods
      .sendPayment(marketId, new anchor.BN(amount))
      .accountsPartial({
        payer: owner.publicKey,
        ata: ata,
        mint: mint,
      })
      .rpc({ commitment: "confirmed" });
    console.log(`Payment sent with signature`, sig);
}

export async function revealResult(
    provider: anchor.AnchorProvider,
    program: Program<ArxPredict>,
    marketId: number,
    arciumClusterPubkey: PublicKey,
    revealResultEventPromise: any
) {
      const revealComputationOffset = new anchor.BN(randomBytes(8), "hex");
      const revealQueueSig = await program.methods
        .revealResult(revealComputationOffset, marketId)
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
            Buffer.from(getCompDefAccOffset("reveal_result")).readUInt32LE()
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

      const revealEvent = await revealResultEventPromise;
      return revealEvent;
}

export async function buyShares(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  arciumClusterPubkey: PublicKey,
  cipher: RescueCipher,
  mpcPublicKey: Uint8Array<ArrayBufferLike>,
  owner: PublicKey,
  marketId: number,
  vote: number,
  shares: number,
  buySharesEventPromise: any
) {
  console.log(`Buying shares for poll ${marketId}`);
  const nonce = randomBytes(16);
  const voteBigInt = BigInt(vote);
  const plaintext = [voteBigInt];
  const ciphertext = cipher.encrypt(plaintext, nonce);
  const voteComputationOffset = new anchor.BN(randomBytes(8), "hex");
  const queueBuySharesSig = await program.methods
    .buyShares(
      voteComputationOffset,
      marketId,
      Array.from(ciphertext[0]),
      Array.from(mpcPublicKey),
      new anchor.BN(deserializeLE(nonce).toString()),
      new anchor.BN(shares)
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(
        program.programId,
        voteComputationOffset
      ),
      clusterAccount: arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("buy_shares")).readUInt32LE()
      ),
      authority: owner,
    })
    .rpc({ commitment: "confirmed" });
  console.log(`Queue buy shares for poll ${marketId} sig is `, queueBuySharesSig);

  const finalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    voteComputationOffset,
    program.programId,
    "confirmed"
  );
  console.log(`Finalize buy shares for poll ${marketId} sig is `, finalizeSig);

  const buySharesEvent = await buySharesEventPromise;
  console.log(
    `Buy shares for poll ${marketId} at timestamp `,
    buySharesEvent.timestamp.toString(),
    `with ${buySharesEvent.amount} usd and ${buySharesEvent.amountU64} usdc`,
    `status: ${buySharesEvent.status}`
  );
}

export async function sellShares(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  arciumClusterPubkey: PublicKey,
  cipher: RescueCipher,
  mpcPublicKey: Uint8Array<ArrayBufferLike>,
  owner: PublicKey,
  marketId: number,
  vote: number,
  shares: number,
  sellSharesEventPromise: any
) {
  console.log(`Selling shares for poll ${marketId}`);
  const nonce = randomBytes(16);
  const voteBigInt = BigInt(vote);
  const plaintext = [voteBigInt];
  const ciphertext = cipher.encrypt(plaintext, nonce);
  const voteComputationOffset = new anchor.BN(randomBytes(8), "hex");
  const queueSellSharesSig = await program.methods
    .sellShares(
      voteComputationOffset,
      marketId,
      Array.from(ciphertext[0]),
      Array.from(mpcPublicKey),
      new anchor.BN(deserializeLE(nonce).toString()),
      new anchor.BN(shares)
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(
        program.programId,
        voteComputationOffset
      ),
      clusterAccount: arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("sell_shares")).readUInt32LE()
      ),
      authority: owner,
    })
    .rpc({ commitment: "confirmed" });
  console.log(`Queue sell shares for poll ${marketId} sig is `, queueSellSharesSig);

  const finalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    voteComputationOffset,
    program.programId,
    "confirmed"
  );
  console.log(`Finalize sell shares for poll ${marketId} sig is `, finalizeSig);

  const sellSharesEvent = await sellSharesEventPromise;
  console.log(
    `Sell shares for poll ${marketId} at timestamp `,
    sellSharesEvent.timestamp.toString(),
    `with ${sellSharesEvent.amount} usd and ${sellSharesEvent.amountU64} usdc`,
    `status: ${sellSharesEvent.status}`
  );
}