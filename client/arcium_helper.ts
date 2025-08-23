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

  const finalizePollSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    userPositionComputationOffset,
    program.programId,
    "confirmed"
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

  const revealFinalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    revealComputationOffset,
    program.programId,
    "confirmed"
  );

  const revealProbsEvent = await revealProbsEventPromise;
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
        Buffer.from(getCompDefAccOffset("init_market_stats")).readUInt32LE()
      ),
      mint: mint,
    })
    .rpc();

  const finalizePollSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    pollComputationOffset,
    program.programId,
    "confirmed"
  );
  return finalizePollSig;
}

export async function sendPayment(
    program: Program<ArxPredict>,
    owner: anchor.web3.Keypair,
    ata: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    marketId: number,
    amount: number
  ) {
    const sig = await program.methods
      .sendPayment(marketId, new anchor.BN(amount))
      .accountsPartial({
        payer: owner.publicKey,
        ata: ata,
        mint: mint,
      })
      .rpc({ commitment: "confirmed" });
    return sig;
}

export async function fundMarket(
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  ata: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
  marketId: number,
  amount: number
) {
  const sig = await program.methods
    .fundMarket(marketId, new anchor.BN(amount))
    .accountsPartial({
      payer: owner.publicKey,
      ata: ata,
      mint: mint,
    })
    .rpc({ commitment: "confirmed" });
  return sig;
}

export async function withdrawPayment(
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  ata: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
  marketId: number,
  amount: number
) {
  const sig = await program.methods
    .withdrawPayment(marketId, new anchor.BN(amount))
    .accountsPartial({
      payer: owner.publicKey,
      ata: ata,
      mint: mint,
    })
    .rpc({ commitment: "confirmed" });
}

export async function settleMarket(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  winner: number,
  marketId: number,
  arciumClusterPubkey: PublicKey,
  eventPromise: any
) {
  const revealComputationOffset = new anchor.BN(randomBytes(8), "hex");
  const revealQueueSig = await program.methods
    .settleMarket(revealComputationOffset, marketId, winner)
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
        Buffer.from(getCompDefAccOffset("reveal_market")).readUInt32LE()
      ),
    })
    .rpc({ commitment: "confirmed" });

  const revealFinalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    revealComputationOffset,
    program.programId,
    "confirmed"
  );

  const settleMarketEvent = await eventPromise;
  return settleMarketEvent;
}


export async function buyShares(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  arciumClusterPubkey: PublicKey,
  cipher: RescueCipher,
  mpcPublicKey: Uint8Array,
  owner: PublicKey,
  marketId: number,
  vote: number,
  shares: number,
  buySharesEventPromise: any
) {
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

  const finalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    voteComputationOffset,
    program.programId,
    "confirmed"
  );

  const buySharesEvent = await buySharesEventPromise;
  const buySharesAmountUsdc = buySharesEvent.amount / 1e6;
  console.log(`Buy shares event=> status: ${buySharesEvent.status}, amount: ${buySharesAmountUsdc}`);
  return finalizeSig;
}

export async function sellShares(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  arciumClusterPubkey: PublicKey,
  cipher: RescueCipher,
  mpcPublicKey: Uint8Array,
  owner: PublicKey,
  marketId: number,
  vote: number,
  shares: number,
  sellSharesEventPromise: any
) {
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

  const finalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    voteComputationOffset,
    program.programId,
    "confirmed"
  );

  const sellSharesEvent = await sellSharesEventPromise;
  const sellSharesAmountUsdc = sellSharesEvent.amount / 1e6;
  console.log(`Sell shares event=> status: ${sellSharesEvent.status}, amount: ${sellSharesAmountUsdc}`);
  return finalizeSig;
}

export async function claimRewards(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  arciumClusterPubkey: PublicKey,
  owner: PublicKey,
  marketId: number,
  claimRewardsEventPromise: any
) {
  const claimRewardsComputationOffset = new anchor.BN(randomBytes(8), "hex");
  const queueClaimRewardsSig = await program.methods
    .claimRewards(
      claimRewardsComputationOffset,
      marketId
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(
        program.programId,
        claimRewardsComputationOffset
      ),
      clusterAccount: arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("claim_rewards")).readUInt32LE()
      ),
      authority: owner,
    })
    .rpc({ commitment: "confirmed" });

  const finalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    claimRewardsComputationOffset,
    program.programId,
    "confirmed"
  );

  const claimRewardsEvent = await claimRewardsEventPromise;
}


export async function claimMarketFunds(
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  ata: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
  marketId: number,
  claimMarketFundsEventPromise: any
) {
  const sig = await program.methods
    .claimMarketFunds(marketId)
    .accountsPartial({
      payer: owner.publicKey,
      ata: ata,
      mint: mint,
    })
    .rpc({ commitment: "confirmed" });

  const claimMarketFundsEvent = await claimMarketFundsEventPromise;
  const claimMarketFundsAmountUsdc = claimMarketFundsEvent.amount / 1e6;
  console.log(`Claim market funds event=> amount: ${claimMarketFundsAmountUsdc}`);
  return sig;
}