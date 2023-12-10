# Keepix.Wallets.Solana

Library that respects the WalletLibraryInterface.  
This library is used to create wallets, hold coin and token balances and carry out transactions.  
  
```js
class Wallet {
    constructor({}: {
        password?: string,
        mnemonic?: string,
        privateKey?: string,
        privateKeyTemplate?: string
    }) {}

    getPrivateKey: () => string;
    getMnemonic: () => string | undefined;
    getAddress: () => string;
    getProdiver: () => Promise<any>;

    // returns like 1.01 (Always in readable value)
    getCoinBalance: (walletAddress?: string) => Promise<string>;
    // returns like 1.01 (Always in readable value)
    getTokenBalance: (tokenAddress: string, walletAddress?: string) => Promise<string>;

    // amount is always like 1.20 ETH 
    estimateCostSendCoinTo: (receiverAddress: string, amount: string) => Promise<{ success: boolean, description: string }>;
    estimateCostSendTokenTo: (tokenAddress: string, receiverAddress: string, amount: string) => Promise<{ success: boolean, description: string }>;
    sendCoinTo: (receiverAddress: string, amount: string) => Promise<{ success: boolean, description: string }>;
    sendTokenTo: (tokenAddress: string, receiverAddress: string, amount: string) => Promise<{ success: boolean, description: string }>;
}

export interface WalletLibraryInterface {
    Wallet: typeof Wallet;
};
```