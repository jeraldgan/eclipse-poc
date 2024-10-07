'use client';

import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { useEffect, useState } from 'react';

const PROGRAM_ID = new PublicKey(
  '89CEviJRnMBntpnCGiSkqN37KoZSm1jbK2Uk23URGqpj',
);

/**
 * The state of a greeting account managed by the hello world program
 */
class GreetingAccount {
  counter = 0;
  constructor(fields: { counter: number } | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
    }
  }
}

/**
 * Borsh schema definition for greeting accounts
 */
const GreetingSchema = new Map([
  [GreetingAccount, { kind: 'struct', fields: [['counter', 'u32']] }],
]);

/**
 * The expected size of each greeting account.
 */
const GREETING_SIZE = borsh.serialize(
  GreetingSchema,
  new GreetingAccount(),
).length;

const randomAccount = new PublicKey(
  'BE4VLUD2WeqsFjnYNmzWXD2dBXdLujem2QRzpHJTNrdm',
);

const Homepage = () => {
  const [wallet, setWallet] = useState<Keypair | null>(null);

  useEffect(() => {
    const storedWallet = localStorage.getItem('wallet');
    if (storedWallet) {
      const secretKey = new Uint8Array(JSON.parse(storedWallet));
      setWallet(Keypair.fromSecretKey(secretKey));
    } else {
      const newWallet = Keypair.generate();
      localStorage.setItem(
        'wallet',
        JSON.stringify(Array.from(newWallet.secretKey)),
      );
      setWallet(newWallet);
    }
  }, []);

  const handleClick = async () => {
    if (!wallet) return;

    const connection = new Connection(
      'https://testnet.dev2.eclipsenetwork.xyz',
      'confirmed',
    );

    console.log(`Using program ${PROGRAM_ID.toBase58()}`);

    const greetedPubkey = await PublicKey.createWithSeed(
      wallet.publicKey,
      'hello',
      PROGRAM_ID,
    );

    // Check if the greeting account has already been created
    const greetedAccount = await connection.getAccountInfo(greetedPubkey);
    if (greetedAccount === null) {
      console.log(
        'Creating account',
        greetedPubkey.toBase58(),
        'to say hello to',
      );
      const lamports =
        await connection.getMinimumBalanceForRentExemption(GREETING_SIZE);

      const transaction = new Transaction().add(
        SystemProgram.createAccountWithSeed({
          fromPubkey: wallet.publicKey,
          basePubkey: wallet.publicKey,
          seed: 'hello',
          newAccountPubkey: greetedPubkey,
          lamports,
          space: GREETING_SIZE,
          programId: PROGRAM_ID,
        }),
      );
      await sendAndConfirmTransaction(connection, transaction, [wallet]);
    }

    const instruction = new TransactionInstruction({
      keys: [{ pubkey: greetedPubkey, isSigner: false, isWritable: true }],
      programId: PROGRAM_ID,
      data: Buffer.alloc(0), // All instructions are hellos
    });

    try {
      const signature = await await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [wallet],
      );
      console.log('Transaction confirmed. Signature:', signature);
    } catch (error) {
      console.error('Error sending transaction:', error);
    }
  };

  return (
    <section className="grid h-full place-content-center">
      <button
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        onClick={handleClick}
      >
        Say Hello
      </button>
      {wallet && (
        <div className="mt-4">
          <p>Wallet Public Key: {wallet.publicKey.toString()}</p>
        </div>
      )}
    </section>
  );
};

export default Homepage;
