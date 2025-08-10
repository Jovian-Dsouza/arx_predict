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
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

import {
  createTokenMint,
  getRequiredATA,
  readKpJson,
} from "../client/utils"
import {
  getMXEPublicKeyWithRetry,
  getProbs,
  createUserPosition
} from "../client/arcium_helper"
import {
  initUserPositionCompDef,
  initVoteCompDef,
  initRevealResultCompDef,
  initRevealProbsCompDef
} from "../client/init_comp_defs"


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
    const mint = await createTokenMint(provider as anchor.AnchorProvider, owner);
    const ata = await getRequiredATA(provider as anchor.AnchorProvider, owner, mint, 1000 * 1e6);
    console.log("Token mint: ", mint.toString());
    console.log("Owner ATA: ", ata.toString());

    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );

    console.log("MXE x25519 pubkey is", mxePublicKey);

    console.log("Initializing computation definitions");
    const initVoteStatsSig = await initVoteStatsCompDef(program, owner, false);
    const initUserPositionSig = await initUserPositionCompDef(provider as anchor.AnchorProvider, program, owner, false);
    const initVoteSig = await initVoteCompDef(provider as anchor.AnchorProvider, program, owner, false);
    const initRRSig = await initRevealResultCompDef(provider as anchor.AnchorProvider, program, owner, false);
    const initRPSig = await initRevealProbsCompDef(provider as anchor.AnchorProvider, program, owner, false);
    console.log("Computation definitions initialized");

    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const options = [
      "Yes",
      "No",
      "Maybe",
      "Not Sure"
    ];
    // Create multiple polls
    for (const POLL_ID of POLL_IDS) {
      const pollNonce = randomBytes(16);

      const pollComputationOffset = new anchor.BN(randomBytes(8), "hex");

      const pollSig = await program.methods
        .createMarket(
          pollComputationOffset,
          POLL_ID,
          `Poll ${POLL_ID}: $SOL to 500?`,
          options,
          new anchor.BN(deserializeLE(pollNonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            program.programId,
            pollComputationOffset
          ),
          clusterAccount: arciumEnv.arciumClusterPubkey,
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

      console.log(`Poll ${POLL_ID} created with signature`, pollSig);

      const finalizePollSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        pollComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(`Finalize poll ${POLL_ID} sig is `, finalizePollSig);
    }

    // Reveal probs for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const probs = await getProbs(provider as anchor.AnchorProvider, program, POLL_ID, arciumEnv.arciumClusterPubkey, awaitEvent("revealProbsEvent"));
      console.log(`Probs for poll ${POLL_ID}:`, probs);
      // expect(revealProbsEvent.share0).to.equal(0.5);
      // expect(revealProbsEvent.share1).to.equal(0.5);
    }

    for (const POLL_ID of POLL_IDS) {
       await createUserPosition(provider as anchor.AnchorProvider, program, arciumEnv.arciumClusterPubkey, POLL_ID);
    }

    // Cast votes for each poll with different outcomes
    const voteOutcomes = [1, 1, 0]; // Different outcomes for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const vote = BigInt(voteOutcomes[i]);
      const plaintext = [vote];

      const nonce = randomBytes(16);
      const ciphertext = cipher.encrypt(plaintext, nonce);
      const amount = 10 * 1e6;

      await sendPayment(program, owner, ata, mint, POLL_ID, amount);

      const voteEventPromise = awaitEvent("voteEvent");

      console.log(`Voting for poll ${POLL_ID}`);

      const voteComputationOffset = new anchor.BN(randomBytes(8), "hex");
      const queueVoteSig = await program.methods
        .vote(
          voteComputationOffset,
          POLL_ID,
          Array.from(ciphertext[0]),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString()),
          new anchor.BN(amount)
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            program.programId,
            voteComputationOffset
          ),
          clusterAccount: arciumEnv.arciumClusterPubkey,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("vote")).readUInt32LE()
          ),
          authority: owner.publicKey,
        })
        .rpc({ commitment: "confirmed" });
      console.log(`Queue vote for poll ${POLL_ID} sig is `, queueVoteSig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        voteComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(`Finalize vote for poll ${POLL_ID} sig is `, finalizeSig);

      const voteEvent = await voteEventPromise;
      console.log(
        `Vote casted for poll ${POLL_ID} at timestamp `,
        voteEvent.timestamp.toString(),
        `with ${voteEvent.totalVotes} votes`
      );
    }
    // Reveal probs for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const probs = await getProbs(provider as anchor.AnchorProvider, program, POLL_ID, arciumEnv.arciumClusterPubkey, awaitEvent("revealProbsEvent"));
      console.log(`Probs for poll ${POLL_ID}:`, probs);
      // expect(revealProbsEvent.share0).to.equal(0.5);
      // expect(revealProbsEvent.share1).to.equal(0.5);
    }

    // Reveal results for each poll
    for (let i = 0; i < POLL_IDS.length; i++) {
      const POLL_ID = POLL_IDS[i];
      const expectedOutcome = voteOutcomes[i];

      const revealEventPromise = awaitEvent("revealResultEvent");
      const revealComputationOffset = new anchor.BN(randomBytes(8), "hex");
      const revealQueueSig = await program.methods
        .revealResult(revealComputationOffset, POLL_ID)
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            program.programId,
            revealComputationOffset
          ),
          clusterAccount: arciumEnv.arciumClusterPubkey,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("reveal_result")).readUInt32LE()
          ),
        })
        .rpc({ commitment: "confirmed" });
      console.log(`Reveal queue for poll ${POLL_ID} sig is `, revealQueueSig);

      const revealFinalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        revealComputationOffset,
        program.programId,
        "confirmed"
      );
      console.log(
        `Reveal finalize for poll ${POLL_ID} sig is `,
        revealFinalizeSig
      );

      const revealEvent = await revealEventPromise;
      console.log(
        `Decrypted winner for poll ${POLL_ID} is `,
        revealEvent.output
      );
      expect(revealEvent.output).to.equal(expectedOutcome);
    }
  });

  async function sendPayment(
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
        mint: mint
      })
      .rpc({ commitment: "confirmed" });
    console.log(`Payment sent with signature`, sig);
  }

  async function initVoteStatsCompDef(
    program: Program<ArxPredict>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offset = getCompDefAccOffset("init_vote_stats");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    console.log(
      "Init vote stats computation definition pda is ",
      compDefPDA.toBase58()
    );

    const sig = await program.methods
      .initVoteStatsCompDef()
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
      const rawCircuit = fs.readFileSync("build/init_vote_stats.arcis");

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "init_vote_stats",
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

  
  

  
});

