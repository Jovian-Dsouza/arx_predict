import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import * as anchor from "@coral-xyz/anchor";

export async function createTokenMint(
  provider: anchor.AnchorProvider,
  wallet: anchor.web3.Keypair
) {
  const mint = await createMint(
    provider.connection,
    wallet, //payer
    wallet.publicKey, //mint authoritu
    null, //freeze authority
    6
  );
  return mint;
}

export async function getRequiredATA(
  provider: anchor.AnchorProvider,
  wallet: anchor.web3.Keypair,
  mint: anchor.web3.PublicKey,
  mintAuthority: anchor.web3.Keypair,
  feePayer: anchor.web3.Keypair,
  mintAmount: number = 0
) {
  const ata = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      feePayer,
      mint,
      wallet.publicKey,
      false
    )
  ).address;
  if (mintAmount > 0) {
    await mintTo(
      provider.connection,
      feePayer, //fee payer
      mint,
      ata,
      mintAuthority, //mint authority
      mintAmount
    );
  }
  return ata;
}

export function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
}

export function generateKeypairFromSeed(seed: string) {
  const bytes1 = new TextEncoder().encode(seed);
  let seedUint = new Uint8Array([...bytes1]);
  let finalSeeds = new Uint8Array(32);
  finalSeeds.set(seedUint.subarray(0, 32));
  return anchor.web3.Keypair.fromSeed(finalSeeds);
}