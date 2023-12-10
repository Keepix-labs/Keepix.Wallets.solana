import { mnemonicToSeedSync, entropyToMnemonic } from 'bip39';
import { 
    Keypair,
    Connection,
    clusterApiUrl,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
    createTransferCheckedInstruction,
} from "@solana/spl-token";
import { randomBytes } from 'crypto';

function createPrivateKey(templatePrivateKey: string, password: string) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(templatePrivateKey + password, 'utf8').digest('hex');
    return hash.substring(0, 64);
}

export class Wallet {

    private keypair: Keypair;
    private mnemonic?: string;
    private type: string = 'solana';
    private keepixTokens?: { coins: any, tokens: any };
    private rpc: any;

    constructor({
        password,
        mnemonic,
        privateKey,
        keepixTokens,
        rpc,
        privateKeyTemplate = '0x2050939757b6d498bb0407e001f0cb6db05c991b3c6f7d8e362f9d27c70128b9'
    }:{
        password?: string,
        mnemonic?: string,
        privateKey?: string,
        keepixTokens?: { coins: any, tokens: any }, // whitelisted coins & tokens
        rpc?: any,
        privateKeyTemplate?: string,
    }) {
        this.keepixTokens = keepixTokens;
        this.rpc = rpc;
        this.keypair = Keypair.generate();

        // from password
        if (password !== undefined) {
            const newPrivateKeySol = createPrivateKey(privateKeyTemplate, password);
            this.mnemonic = entropyToMnemonic(Buffer.from(newPrivateKeySol, 'hex'));
            const seed = mnemonicToSeedSync(this.mnemonic, "");
            this.keypair = Keypair.fromSeed(seed.slice(0, 32));
            return ;
        }
        // from mnemonic
        if (mnemonic !== undefined) {
            this.mnemonic = mnemonic;
            const seed = mnemonicToSeedSync(mnemonic, "");
            this.keypair = Keypair.fromSeed(seed.slice(0, 32));
            return ;
        }
        // from privateKey only
        if (privateKey !== undefined) {
            this.mnemonic = undefined;
            this.keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
            return ;
        }
        this.mnemonic = entropyToMnemonic(randomBytes(32));
        this.keypair = Keypair.generate();
    }

    // PUBLIC

    public getPrivateKey() {
        return Buffer.from(this.keypair.secretKey).toString('hex');
    }

    public getMnemonic() {
        return this.mnemonic;
    }

    public getAddress() {
        return this.keypair.publicKey.toString();
    }

    public async getProdiver() {
        const defaultRPC = new Connection('https://api.mainnet-beta.solana.com', "confirmed");
        let overridedRpc: any = undefined;

        if (this.rpc !== undefined && typeof this.rpc === 'object') {
            overridedRpc = this.rpc;
        }

        const coins = this.keepixTokens?.coins;
        if (coins === undefined) {
            return defaultRPC;
        }
        const coinInformation = coins[this.type];
        if (coinInformation === undefined) {
            return defaultRPC;
        }
        if (coins[this.type].rpcs === undefined || !Array.isArray(coins[this.type].rpcs)) {
            return defaultRPC;
        }
        if (coins[this.type].rpcs.length === 0) {
            return defaultRPC;
        }
        let rpc = coins[this.type].rpcs[Math.floor(Math.random()*coins[this.type].rpcs.length)];

        if (overridedRpc !== undefined
            && overridedRpc.chainId !== undefined
            && overridedRpc.url !== undefined && overridedRpc.url !== '') {
            rpc = overridedRpc;
        }
        return new Connection(rpc.url, "confirmed");
    }

    public async getCoinBalance(walletAddress?: string) {
        let publicKey;

        if (walletAddress)
            publicKey = new PublicKey(walletAddress);
        else
            publicKey = new PublicKey(this.keypair.publicKey.toString())
        const provider = await this.getProdiver();
        return (await provider.getBalance(publicKey) / LAMPORTS_PER_SOL);
    }

    public async getTokenBalance(tokenAddress: string, walletAddress?: string) {
        let publicKey;

        if (walletAddress) {
            publicKey = new PublicKey(walletAddress);
        } else {
            publicKey = this.keypair.publicKey;
        }

        const provider = await this.getProdiver();
        const tokenAccounts = await provider.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(tokenAddress) });
        let tokenBalance: number = 0;

        for (const accountInfo of tokenAccounts.value) {
            const decimals = accountInfo.account.data["parsed"]["info"]["tokenAmount"]["decimals"];
            const amount = accountInfo.account.data["parsed"]["info"]["tokenAmount"]["amount"];

            tokenBalance = Number((amount / Math.pow(10, decimals)).toFixed(decimals));
        }

        return tokenBalance;
    }

    public async estimateCostOfTx(tx: any) {
        try {
            const provider = await this.getProdiver();
            const recentBlockhash = await provider.getRecentBlockhash();

            tx.recentBlockhash = recentBlockhash.blockhash;
            tx.sign(this.keypair);

            const serializedTx = tx.serialize();
            const txSize = serializedTx.length;
            const feeRate = recentBlockhash.feeCalculator.lamportsPerSignature;
            const estimatedCost = txSize * feeRate;

            return { success: true, description: `${estimatedCost}` };
        } catch (error) {
            return { success: false, description: `Getting estimation failed: ${error}` };
        }
    }

    public async estimateCostSendCoinTo(receiverAddress: string, amount: number) {
        try {
            const receiverPublicKey = new PublicKey(receiverAddress);
            const walletBalance = await this.getCoinBalance();

            if (walletBalance < amount) {
                return { success: false, description: `insufficient funds` };
            }

            const transaction = new Transaction();

            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: this.keypair.publicKey,
                    toPubkey: receiverPublicKey,
                    lamports: amount * 1e9,
                })
            );
            const estimatedCost = await this.estimateCostOfTx(transaction);

            return estimatedCost;
        } catch (error) {
            return { success: false, description: `Getting estimation failed: ${error}` };
        }
    }

    public async estimateCostSendTokenTo(tokenAddress: string, receiverAddress: string, amount: number) {
        try {
            const receiverPublicKey = new PublicKey(receiverAddress);
            const tokenBalance = await this.getTokenBalance(tokenAddress);

            if (tokenBalance < Number(amount)) {
                return { success: false, description: 'insufficient funds' };
            }

            // const test = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
            const provider = await this.getProdiver();
            const tokenAccount = await provider.getParsedTokenAccountsByOwner(this.keypair.publicKey, { mint: new PublicKey(tokenAddress) });

            const transaction = new Transaction();

            transaction.add(
                createTransferCheckedInstruction(
                    this.keypair.publicKey,
                    new PublicKey(tokenAddress),
                    receiverPublicKey,
                    this.keypair.publicKey,
                    amount * 1e9,
                    tokenAccount.value[0].account.data.parsed.info.decimals,
                )
            );

            const estimatedCost = await this.estimateCostOfTx(transaction);

            return estimatedCost;
        } catch (error) {
            return { success: false, description: `Getting estimation failed: ${error}` };
        }
    }

    public async sendCoinTo(receiverAddress: string, amount: number) {
        try {
            const receiverPublicKey = new PublicKey(receiverAddress);
            const walletBalance = await this.getCoinBalance();

            if (walletBalance < amount) {
                return { success: false, description: `insufficient funds` };
            }

            const transaction = new Transaction();
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: this.keypair.publicKey,
                    toPubkey: receiverPublicKey,
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );
            transaction.sign(this.keypair);
            const provider = await this.getProdiver();
            const tx = await provider.sendTransaction(transaction, [this.keypair]);

            return { success: true, description: tx };
        } catch (error) {
            return { success: false, description: `Sending SOL failed: ${error}` };
        }
    }

    public async sendTokenTo(tokenAddress: string, receiverAddress: string, amount: number) {
        try {
            const receiverPublicKey = new PublicKey(receiverAddress);
            const tokenBalance = await this.getTokenBalance(tokenAddress);

            if (tokenBalance < Number(amount)) {
                return { success: false, description: 'insufficient funds' };
            }

            // const test = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
            const provider = await this.getProdiver();
            const tokenAccount = await provider.getParsedTokenAccountsByOwner(this.keypair.publicKey, { mint: new PublicKey(tokenAddress) });
            const transaction = new Transaction();

            transaction.add(
                createTransferCheckedInstruction(
                    this.keypair.publicKey,
                    new PublicKey(tokenAddress),
                    receiverPublicKey,
                    this.keypair.publicKey,
                    amount * 1e9,
                    tokenAccount.value[0].account.data.parsed.info.decimals,
                )
            );
            transaction.sign(this.keypair);
            const tx = await provider.sendTransaction(transaction, [this.keypair]);

            return { success: true, tx, description: tx };
        } catch (error) {
            return { success: false, description: `Send token failed: ${error}` };
        }
    }
}