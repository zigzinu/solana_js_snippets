const { getRealms } = require('@solana/spl-governance');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const programId = new PublicKey('GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw');

const main = async () => {
    const realms = await getRealms(connection, programId);
    let myPublicKey = new PublicKey('8c1wDYsAynw1ZQjTqkt35qPxHaq5fFwmVdtpmujws8D3');
    console.log(myPublicKey);
    console.log(realms.filter(realm => realm.owner);
}

main()

