const web3 = require('@solana/web3.js');
const PublicKey = require('@solana/web3.js').PublicKey;
const nacl = require('tweetnacl');
const cm = require('@metaplex-foundation/mpl-candy-machine');
const anchor = require('@project-serum/anchor');
const SystemProgram = web3.SystemProgram;
console.log(SystemProgram.programId);
console.log(anchor.web3.SystemProgram);
const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LIMIT = 5;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_URI_LENGTH = 200;
const CONFIG_ARRAY_START_V2 =
  8 + // key
  32 + // authority
  32 + //wallet
  33 + // token mint
  4 +
  6 + // uuid
  8 + // price
  8 + // items available
  9 + // go live
  10 + // end settings
  4 +
  MAX_SYMBOL_LENGTH + // u32 len + symbol
  2 + // seller fee basis points
  4 +
  MAX_CREATOR_LIMIT * MAX_CREATOR_LEN + // optional + u32 len + actual vec
  8 + //max supply
  1 + // is mutable
  1 + // retain authority
  1 + // option for hidden setting
  4 +
  MAX_NAME_LENGTH + // name length,
  4 +
  MAX_URI_LENGTH + // uri length,
  32 + // hash
  4 + // max number of lines;
  8 + // items redeemed
  1 + // whitelist option
  1 + // whitelist mint mode
  1 + // allow presale
  9 + // discount price
  32 + // mint key for whitelist
  1 +
  32 +
  1; // gatekeeper
const CONFIG_LINE_SIZE_V2 = 4 + 32 + 4 + 200;
const CANDY_MACHINE_PROGRAM_V2_ID = new PublicKey(
  'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ',
);

console.log(cm.CandyMachineProgram.PUBKEY);
console.log(CANDY_MACHINE_PROGRAM_V2_ID);
const wait = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay))

const uuidFromConfigPubkey = (configAccount) => {
  return configAccount.toBase58().slice(0, 6);
}

const main = async () => {
  let payer = web3.Keypair.generate();
  let connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
  console.log('payer publicKey', payer.publicKey.toString());

  // airdrop payer
  console.time("airdrop request payer");
  let airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    web3.LAMPORTS_PER_SOL,
  );
  console.timeEnd("airdrop request payer");
  console.time("airdrop confirm payer");
  await connection.confirmTransaction(airdropSignature);
  console.timeEnd("airdrop confirm payer");

  console.time("wait for sec");
  // await wait(10000);
  console.timeEnd("wait for sec");

  // candy machine
  let candyAccount = web3.Keypair.generate();
  let uuid = uuidFromConfigPubkey(candyAccount.publicKey);
  console.log("uuid", uuid);
  console.log('candyAccount publicKey', candyAccount.publicKey.toString());
  //console.time("airdrop request candyAccount");
  //let airdropSignature2 = await connection.requestAirdrop(
  //  candyAccount.publicKey,
  //  web3.LAMPORTS_PER_SOL,
  //);
  //console.timeEnd("airdrop request candyAccount");
  //console.time("airdrop confirm candyAccount");
  //await connection.confirmTransaction(airdropSignature2);
  //console.timeEnd("airdrop confirm candyAccount");

  let candyData = {
    itemsAvailable: new anchor.BN(10),
    uuid: uuid,
    symbol: 'NB',
    sellerFeeBasisPoints: 1000,
    isMutable: true,
    maxSupply: new anchor.BN(0),
    retainAuthority: true,
    gatekeeper: null,
    goLiveDate: new anchor.BN(Date.now() / 1000),
    price: new anchor.BN(0),
    endSettings: null,
    whitelistMintSettings: null,
    hiddenSettings: null,
    creators: [
      {
        address: new PublicKey('SELRKDPaN3J6KQdP6VbhnZgGjiv3PcFRonG8khWhCX1'),
        verified: true,
        share: 100
      }
    ]
  };

  let args = {
    data: candyData
  };
  let accounts = {
    candyMachine: candyAccount.publicKey,
    wallet: payer.publicKey,
    authority: payer.publicKey,
    payer: payer.publicKey,
  };
  console.log(accounts);
  console.log(candyData);
  
  // create manualTransaction 
  let recentBlockhash = await connection.getRecentBlockhash();
  let manualTransaction = new web3.Transaction({
    recentBlockhash: recentBlockhash.blockhash,
    feePayer: payer.publicKey
  });

  // add instructions
  let instructions = []

  // instruction 1: createCandyMachineV2Account
  let size =
    CONFIG_ARRAY_START_V2 +
    4 +
    candyData.itemsAvailable.toNumber() * CONFIG_LINE_SIZE_V2 +
    8 +
    2 * (Math.floor(candyData.itemsAvailable.toNumber() / 8) + 1);
  let lamports = await connection.getMinimumBalanceForRentExemption(size,);
  console.log("lamports", lamports);
  console.log(cm.CandyMachineProgram.PUBKEY.toBuffer());
  // let createCandyMachineV2AccountInstruction = SystemProgram.createAccount({
  //   fromPubkey: payer.publicKey,
  //   newAccountPubkey: candyAccount.publicKey,
  //   space: size,
  //   lamports: lamports,
  //   programId: CANDY_MACHINE_PROGRAM_V2_ID,
  // });
  manualTransaction.add(
	  SystemProgram.createAccount({
  	  fromPubkey: payer.publicKey,
  	  newAccountPubkey: candyAccount.publicKey,
  	  space: size,
  	  lamports: lamports,
  	  programId: CANDY_MACHINE_PROGRAM_V2_ID,
  	})
	);
  // console.log(createCandyMachineV2AccountInstruction);
  // instructions.push(createCandyMachineV2AccountInstruction);

  // instruction 2:  initializeCandyMachineInstruction
  let initializeCandyMachineInstruction = cm.CandyMachineProgram.instructions.createInitializeCandyMachineInstruction(accounts, args);
	manualTransaction.add( initializeCandyMachineInstruction	);
  // console.log(initializeCandyMachineInstruction);
  // instructions.push(initializeCandyMachineInstruction);
  
  // manualTransaction.add(instructions);

  // sign manualTransaction
  let transactionBuffer = manualTransaction.serializeMessage();

  let payerSignature = nacl.sign.detached(transactionBuffer, payer.secretKey);
  let candyAccountSignature = nacl.sign.detached(transactionBuffer, candyAccount.secretKey);
  manualTransaction.addSignature(payer.publicKey, payerSignature);
  manualTransaction.addSignature(candyAccount.publicKey, candyAccountSignature);
	console.log(manualTransaction.signatures);
	let isVerifiedSignature = manualTransaction.verifySignatures();
	console.log("isVerifiedSignature", isVerifiedSignature);

  let rawTransaction = manualTransaction.serialize();

  // send raw transaction
  await web3.sendAndConfirmRawTransaction(connection, rawTransaction);
}

main();
