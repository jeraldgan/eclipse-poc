'use client';

import * as web3 from '@solana/web3.js';
import { useEffect, useState } from 'react';

const Homepage = () => {
  const [wallet, setWallet] = useState<web3.Keypair | null>(null);

  useEffect(() => {
    const generateWallet = async () => {
      const newWallet = web3.Keypair.generate();
      setWallet(newWallet);
    };

    generateWallet();
  }, []);

  console.log(wallet);

  return (
    <section className="grid h-full place-content-center">
      <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
        Click me
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
