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

import {
  GREETING_SIZE,
  GreetingAccount,
  GreetingSchema,
  InstructionData,
} from '@/common/types';

// Program ID and RPC endpoint
const PROGRAM_ID = new PublicKey(
  '5BFhyPN84At5mLcVbs83mLgp6aYiGJZ5JtDYese2DeLy',
);
const RPC_ENDPOINT = 'https://testnet.dev2.eclipsenetwork.xyz';

// Helper functions
const getConnection = () => new Connection(RPC_ENDPOINT, 'confirmed');

const getGreetedPubkey = async (wallet: Keypair) =>
  PublicKey.createWithSeed(wallet.publicKey, 'hello', PROGRAM_ID);

const reportGreetings = async (
  connection: Connection,
  greetedPubkey: PublicKey,
): Promise<string> => {
  const accountInfo = await connection.getAccountInfo(greetedPubkey);
  if (!accountInfo) throw 'Error: cannot find the greeted account';

  const greeting = borsh.deserialize(
    GreetingSchema,
    GreetingAccount,
    accountInfo.data,
  );
  return `${greetedPubkey.toBase58()} has been greeted ${greeting.counter} time(s)`;
};

const Homepage = () => {
  const [wallet, setWallet] = useState<Keypair | null>(null);

  // Load wallet from local storage or generate a new one
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

  // Handle greeting transaction
  const handleSayHello = async () => {
    if (!wallet) return;

    const loadingToastId = toast.loading('Processing transaction...');
    const connection = getConnection();
    const greetedPubkey = await getGreetedPubkey(wallet);

    try {
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
        const createAccountTx = new Transaction().add(
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
        await sendAndConfirmTransaction(connection, createAccountTx, [wallet]);
      }

      // Send greeting instruction
      const randomNumber = Math.floor(Math.random() * 101);
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
              [
                InstructionData,
                { kind: 'struct', fields: [['number', 'u32']] },
              ],
            ]),
            new InstructionData({ number: randomNumber }),
          ),
        ),
      });

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [wallet],
      );
      toast.success('Transaction successful', { id: loadingToastId });
    } catch (error) {
      toast.error('Error sending transaction', { id: loadingToastId });
      console.error('Error sending transaction:', error);
    }
  };

  // Handle checking greetings
  const handleCheckGreetings = async () => {
    if (!wallet) return;

    const loadingToastId = toast.loading('Checking greetings...');
    const connection = getConnection();
    const greetedPubkey = await getGreetedPubkey(wallet);

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
        onClick={handleSayHello}
      >
        Say Hello
      </button>
      <button
        className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        onClick={handleCheckGreetings}
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
