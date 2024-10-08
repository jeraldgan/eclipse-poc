'use client';

import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';

const PROGRAM_ID = new PublicKey(
  '5BFhyPN84At5mLcVbs83mLgp6aYiGJZ5JtDYese2DeLy',
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

async function reportGreetings(
  connection: Connection,
  greetedPubkey: PublicKey,
): Promise<string> {
  const accountInfo = await connection.getAccountInfo(greetedPubkey);
  if (accountInfo === null) {
    throw 'Error: cannot find the greeted account';
  }
  const greeting = borsh.deserialize(
    GreetingSchema,
    GreetingAccount,
    accountInfo.data,
  );
  return `${greetedPubkey.toBase58()} has been greeted ${greeting.counter} time(s)`;
}

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
      keys: [
        { pubkey: greetedPubkey, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        {
          pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: PROGRAM_ID,
      data: Buffer.from([0]), // 0 represents the "hello" instruction
    });

    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [wallet],
      );
      const greetingMessage = await reportGreetings(connection, greetedPubkey);
      toast.success(greetingMessage, {
        id: toast.loading('Processing transaction...'),
      });
    } catch (error) {
      toast.error('Error sending transaction', {
        id: toast.loading('Processing transaction...'),
      });
      console.error('Error sending transaction:', error);
    }
  };

  return (
    <section className="grid h-full place-content-center">
      <Toaster position="top-right" />
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
