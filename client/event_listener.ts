import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ArxPredict } from "../target/types/arx_predict";
import { setup, SetupData } from "./setup";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
// @ts-ignore
import * as IDL from "../target/idl/arx_predict.json";

async function listenToEvents(setupData: SetupData) {
  const { program, connection } = setupData;
  
  // Define event type using the program instance
  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  
  console.log("🎧 Starting event listener for ArxPredict program...");
  console.log("Program ID:", program.programId.toBase58());
  console.log("Listening for events...\n");

  // Listen to all available events based on the actual IDL
  const eventNames: (keyof Event)[] = [
    "voteEvent",
    "revealResultEvent", 
    "revealProbsEvent",
    "buySharesEvent",
    "sellSharesEvent",
    "claimRewardsEvent",
    "initMarketStatsEvent"
  ];

  // Create listeners for each event type
  eventNames.forEach(eventName => {
    const listenerId = program.addEventListener(eventName, (event) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 📡 ${eventName}:`);
      console.log(JSON.stringify(event, null, 2));
      console.log("─".repeat(50));
    });
    
    console.log(`✅ Listening for ${eventName} events`);
  });

  // Keep the script running
  console.log("\n🚀 Event listener is active. Press Ctrl+C to stop.\n");
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down event listener...');
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {
    // Heartbeat to keep connection alive
  }, 30000);
}

async function listenToSpecificEvent(setupData: SetupData, eventName: string) {
  const { program } = setupData;
  
  // Define event type using the program instance
  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  
  console.log(`🎧 Listening specifically for ${eventName} events...`);
  console.log("Program ID:", program.programId.toBase58());
  console.log("Press Ctrl+C to stop.\n");

  const listenerId = program.addEventListener(eventName as keyof Event, (event) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📡 ${eventName}:`);
    console.log(JSON.stringify(event, null, 2));
    console.log("─".repeat(50));
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down event listener...');
    program.removeEventListener(listenerId);
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {
    // Heartbeat to keep connection alive
  }, 30000);
}

async function main() {
  try {
    console.log("🚀 Initializing ArxPredict event listener...");
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const specificEvent = args[0];
    
    // Setup connection and program
    const setupData = await setup();
    
    if (specificEvent) {
      // Listen to a specific event
      await listenToSpecificEvent(setupData, specificEvent);
    } else {
      // Listen to all events
      await listenToEvents(setupData);
    }
    
  } catch (error) {
    console.error("❌ Error in event listener:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { listenToEvents, listenToSpecificEvent };
