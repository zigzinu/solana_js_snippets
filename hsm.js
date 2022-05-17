const web3 = require('@solana/web3.js');
const nacl = require('tweetnacl');

const areEqual = (first, second) =>
    first.length === second.length && first.every((value, index) => value === second[index]);

const main = async () => {

    // Airdrop SOL for paying transactions
    let payer = web3.Keypair.generate();
    console.log(payer);
    console.log("payer.publicKey", payer.publicKey.toString());
    console.log("payer.secretKey", Buffer.from(payer.secretKey).toString('hex'));

    console.time("connection");
    let connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
    console.timeEnd("connection");
   
    console.time("airdrop request");
    let airdropSignature = await connection.requestAirdrop(
        payer.publicKey,
        web3.LAMPORTS_PER_SOL,
    );
    console.timeEnd("airdrop request");
    
    console.time("airdrop confirm");
    await connection.confirmTransaction(airdropSignature);
    console.timeEnd("airdrop confirm");
    
    let toAccount = web3.Keypair.generate();
    
    // manually construct the transaction
    console.time("recentBlockhash");
    let recentBlockhash = await connection.getRecentBlockhash();
    console.timeEnd("recentBlockhash");
    console.log("recentBlockhash", recentBlockhash);
    
    console.time("OTHERS");
    let manualTransaction = new web3.Transaction({
        recentBlockhash: recentBlockhash.blockhash,
        feePayer: payer.publicKey
    });
    manualTransaction.add(web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: toAccount.publicKey,
        lamports: 1000,
    }));
    
    let transactionBuffer = manualTransaction.serializeMessage();
    console.log("transactionBuffer", transactionBuffer);
    // let transactionBufferHexString = transactionBuffer.toString('hex');
    // console.log(transactionBufferHexString);
    // let transactionBufferRecovered = Buffer.from(transactionBufferHexString, 'hex');
    // console.log("Buffer compare", Buffer.compare(transactionBufferRecovered, transactionBuffer));
    let signature = nacl.sign.detached(transactionBuffer, payer.secretKey);
    console.log("signature", signature);
    
    // let signatureHexString = Buffer.from(signature).toString('hex');
    // let signatureRecovered = Uint8Array.from(Buffer.from(signatureHexString, 'hex'));
    // console.log(areEqual("signature comapre", signature, signatureRecovered));
    
    manualTransaction.addSignature(payer.publicKey, signature);
    
    let isVerifiedSignature = manualTransaction.verifySignatures();
    console.log(`The signatures were verifed: ${isVerifiedSignature}`)
    
    // The signatures were verified: true
    
    let rawTransaction = manualTransaction.serialize();
    console.log("rawTransaction", rawTransaction);
    console.timeEnd("OTHERS"); 
    
    console.time("sendAndConfirmRawTransaction");
    await web3.sendAndConfirmRawTransaction(connection, rawTransaction);
    console.timeEnd("sendAndConfirmRawTransaction");

}

main()
