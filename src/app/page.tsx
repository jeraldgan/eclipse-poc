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

class GreetingAccount {
  counter = 0;
  constructor(fields?: { counter: number }) {
    if (fields) this.counter = fields.counter;
  }
}

const GreetingSchema = new Map([
  [GreetingAccount, { kind: 'struct', fields: [['counter', 'u32']] }],
]);

const GREETING_SIZE = borsh.serialize(
  GreetingSchema,
  new GreetingAccount(),
).length;

class InstructionData {
  number: number;
  constructor(fields: { number: number } | undefined = undefined) {
    this.number = fields?.number ?? 0;
  }
}

async function reportGreetings(
  connection: Connection,
  greetedPubkey: PublicKey,
): Promise<string> {
  const accountInfo = await connection.getAccountInfo(greetedPubkey);
  if (!accountInfo) throw 'Error: cannot find the greeted account';

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
      setWallet(
        Keypair.fromSecretKey(new Uint8Array(JSON.parse(storedWallet))),
      );
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

    const loadingToastId = toast.loading('Processing transaction...');

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

    // Create greeting account if it doesn't exist
    const greetedAccount = await connection.getAccountInfo(greetedPubkey);
    if (!greetedAccount) {
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

    const randomNumber = Math.floor(Math.random() * 101);

    // Send greeting instruction
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
      data: Buffer.from(
        borsh.serialize(
          new Map([
            [InstructionData, { kind: 'struct', fields: [['number', 'u32']] }],
          ]),
          new InstructionData({ number: randomNumber }),
        ),
      ),
    });

    sendAndConfirmTransaction(connection, new Transaction().add(instruction), [
      wallet,
    ])
      .then(() => {
        toast.success('Transaction successful', { id: loadingToastId });
      })
      .catch((error) => {
        toast.error('Error sending transaction', { id: loadingToastId });
        console.error('Error sending transaction:', error);
      });
  };

  const checkGreetings = async () => {
    if (!wallet) return;

    const loadingToastId = toast.loading('Checking greetings...');

    const connection = new Connection(
      'https://testnet.dev2.eclipsenetwork.xyz',
      'confirmed',
    );

    const greetedPubkey = await PublicKey.createWithSeed(
      wallet.publicKey,
      'hello',
      PROGRAM_ID,
    );

    try {
      const greetingMessage = await reportGreetings(connection, greetedPubkey);
      toast.success(greetingMessage, { id: loadingToastId });
    } catch (error) {
      toast.error('Error checking greetings', { id: loadingToastId });
      console.error('Error checking greetings:', error);
    }
  };

  return (
    <section className="grid h-full place-content-center">
      <Toaster position="top-right" />
      <button
        className="mb-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        onClick={handleClick}
      >
        Say Hello
      </button>
      <button
        className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        onClick={checkGreetings}
      >
        Check Number of Greetings
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
