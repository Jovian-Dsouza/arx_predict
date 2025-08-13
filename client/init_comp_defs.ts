import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ArxPredict } from "../target/types/arx_predict";
import { randomBytes } from "crypto";
import * as fs from "fs";
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

export async function initMarketStatsCompDef(
    provider: anchor.AnchorProvider,
    program: Program<ArxPredict>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("init_market_stats");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log(
      "Init vote stats computation definition pda is ",
      compDefPDA.toBase58()
    );

    const sig = await program.methods
      .initMarketStatsCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log("Init vote stats computation definition transaction", sig);

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync("build/init_market_stats.arcis");

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "init_market_stats",
        program.programId,
        rawCircuit,
        true
      );
    } else {
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }

export async function initUserPositionCompDef(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  uploadRawCircuit: boolean
): Promise<string> {
  console.log("Initializing user position computation definition");
  const baseSeedCompDefAcc = getArciumAccountBaseSeed(
    "ComputationDefinitionAccount"
  );
  const offset = getCompDefAccOffset("init_user_position");

  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  console.log(
    "Init user position computation definition pda is ",
    compDefPDA.toBase58()
  );

  const sig = await program.methods
    .initUserPositionCompDef()
    .accounts({
      compDefAccount: compDefPDA,
      payer: owner.publicKey,
      mxeAccount: getMXEAccAddress(program.programId),
    })
    .signers([owner])
    .rpc({
      commitment: "confirmed",
    });
  console.log("Init user position computation definition transaction", sig);

  if (uploadRawCircuit) {
    const rawCircuit = fs.readFileSync("build/init_market_stats.arcis");

    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "init_user_position",
      program.programId,
      rawCircuit,
      true
    );
  } else {
    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(owner);

    await provider.sendAndConfirm(finalizeTx);
  }
  return sig;
}

export async function initRevealResultCompDef(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  uploadRawCircuit: boolean
): Promise<string> {
  const baseSeedCompDefAcc = getArciumAccountBaseSeed(
    "ComputationDefinitionAccount"
  );
  const offset = getCompDefAccOffset("reveal_result");

  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  console.log(
    "Reveal result computation definition pda is ",
    compDefPDA.toBase58()
  );

  const sig = await program.methods
    .initRevealResultCompDef()
    .accounts({
      compDefAccount: compDefPDA,
      payer: owner.publicKey,
      mxeAccount: getMXEAccAddress(program.programId),
    })
    .signers([owner])
    .rpc({
      commitment: "confirmed",
    });
  console.log("Init reveal result computation definition transaction", sig);

  if (uploadRawCircuit) {
    const rawCircuit = fs.readFileSync("build/reveal_result.arcis");

    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "reveal_result",
      program.programId,
      rawCircuit,
      true
    );
  } else {
    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(owner);

    await provider.sendAndConfirm(finalizeTx);
  }
  return sig;
}

export async function initRevealProbsCompDef(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  uploadRawCircuit: boolean
): Promise<string> {
  console.log("Initializing reveal probs computation definition");
  const baseSeedCompDefAcc = getArciumAccountBaseSeed(
    "ComputationDefinitionAccount"
  );
  const offset = getCompDefAccOffset("reveal_probs");

  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  console.log(
    "Reveal probs computation definition pda is ",
    compDefPDA.toBase58()
  );

  const sig = await program.methods
    .initRevealProbsCompDef()
    .accounts({
      compDefAccount: compDefPDA,
      payer: owner.publicKey,
      mxeAccount: getMXEAccAddress(program.programId),
    })
    .signers([owner])
    .rpc({
      commitment: "confirmed",
    });
  console.log("Init reveal probs computation definition transaction", sig);

  if (uploadRawCircuit) {
    const rawCircuit = fs.readFileSync("build/reveal_probs.arcis");

    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "reveal_probs",
      program.programId,
      rawCircuit,
      true
    );
  } else {
    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(owner);

    await provider.sendAndConfirm(finalizeTx);
  }

  console.log(
    "Reveal probs computation definition initialized with signature",
    sig
  );

  return sig;
}

export async function initBuySharesCompDef(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  uploadRawCircuit: boolean
): Promise<string> {
  const baseSeedCompDefAcc = getArciumAccountBaseSeed(
    "ComputationDefinitionAccount"
  );
  const offset = getCompDefAccOffset("buy_shares");

  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  console.log("Init Buy Shares computation definition pda is ", compDefPDA.toBase58());

  const sig = await program.methods
    .initBuySharesCompDef()
    .accounts({
      compDefAccount: compDefPDA,
      payer: owner.publicKey,
      mxeAccount: getMXEAccAddress(program.programId),
    })
    .signers([owner])
    .rpc({
      commitment: "confirmed",
    });
  console.log("Inited buy shares computation definition transaction", sig);

  if (uploadRawCircuit) {
    const rawCircuit = fs.readFileSync("build/buy_shares.arcis");

    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "buy_shares",
      program.programId,
      rawCircuit,
      true
    );
  } else {
    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(owner);

    await provider.sendAndConfirm(finalizeTx);
  }
  return sig;
}

export async function initSellSharesCompDef(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  uploadRawCircuit: boolean
): Promise<string> {
  const baseSeedCompDefAcc = getArciumAccountBaseSeed(
    "ComputationDefinitionAccount"
  );
  const offset = getCompDefAccOffset("sell_shares");

  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  console.log("Init Sell Shares computation definition pda is ", compDefPDA.toBase58());

  const sig = await program.methods
    .initSellSharesCompDef()
    .accounts({
      compDefAccount: compDefPDA,
      payer: owner.publicKey,
      mxeAccount: getMXEAccAddress(program.programId),
    })
    .signers([owner])
    .rpc({
      commitment: "confirmed",
    });
  console.log("Inited sell shares computation definition transaction", sig);

  if (uploadRawCircuit) {
    const rawCircuit = fs.readFileSync("build/sell_shares.arcis");

    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "sell_shares",
      program.programId,
      rawCircuit,
      true
    );
  } else {
    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(owner);

    await provider.sendAndConfirm(finalizeTx);
  }
  return sig;
}

export async function initClaimRewardsCompDef(
  provider: anchor.AnchorProvider,
  program: Program<ArxPredict>,
  owner: anchor.web3.Keypair,
  uploadRawCircuit: boolean
): Promise<string> {
  const baseSeedCompDefAcc = getArciumAccountBaseSeed(
    "ComputationDefinitionAccount"
  );
  const offset = getCompDefAccOffset("claim_rewards");

  const compDefPDA = PublicKey.findProgramAddressSync(
    [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
    getArciumProgAddress()
  )[0];

  console.log("Init Claim Rewards computation definition pda is ", compDefPDA.toBase58());

  const sig = await program.methods
    .initClaimRewardsCompDef()
    .accounts({
      compDefAccount: compDefPDA,
      payer: owner.publicKey,
      mxeAccount: getMXEAccAddress(program.programId),
    })
    .signers([owner])
    .rpc({
      commitment: "confirmed",
    });
  console.log("Inited claim rewards computation definition transaction", sig);

  if (uploadRawCircuit) {
    const rawCircuit = fs.readFileSync("build/sell_shares.arcis");

    await uploadCircuit(
      provider as anchor.AnchorProvider,
      "claim_rewards",
      program.programId,
      rawCircuit,
      true
    );
  } else {
    const finalizeTx = await buildFinalizeCompDefTx(
      provider as anchor.AnchorProvider,
      Buffer.from(offset).readUInt32LE(),
      program.programId
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();
    finalizeTx.recentBlockhash = latestBlockhash.blockhash;
    finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

    finalizeTx.sign(owner);

    await provider.sendAndConfirm(finalizeTx);
  }
  return sig;
}