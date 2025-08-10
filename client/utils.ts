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
  mintAmount: number = 0
) {
  const ata = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet,
      mint,
      wallet.publicKey,
      false
    )
  ).address;
  if (mintAmount > 0) {
    await mintTo(
      provider.connection,
      wallet, //fee payer
      mint,
      ata,
      wallet, //mint authority
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
