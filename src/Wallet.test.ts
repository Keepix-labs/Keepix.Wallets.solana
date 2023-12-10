import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { Keypair } from '@solana/web3.js';
import { Wallet } from './Wallet';


let mockedValues = {};
let queryMockedCallBack = (url) => {

  if (mockedValues[url]) {
    return mockedValues[url];
  } else {
    console.log('mock not intercepted', url);
  }
  return new Promise(resolve => resolve({
    json: () => {
      return new Promise(res => res(''));
    }
  }));
};

jest.mock('node-fetch', () => {
  const originalModule = jest.requireActual('node-fetch');

  //Mock the default export and named export 'foo'
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn((url) => {
        return queryMockedCallBack(url);
      }
    )
  };
});

const mockFetch = () => {
  
}

describe('basic wallet', () => {
    const mnemonic = 'cross tool vague fresh fever bind permit round arrest train reason sentence math comfort castle amount velvet elevator split loyal foil bundle elite museum'
    const address = 'DehxSQMZoTSKUXg9utFFemvuY7N37kkMh9FnJCGrtDHs'
    const privateKey = '0ceab9e154b198dec48b4d23028992e1c29d9b8ec989d24576b3e367e284e7d2bbf50abd75fad249c4d8225ff7c9708be0c705e010a7cb0878f103dcf2bfec2a'

    it('can generate with random', async () => {
        const wallet = new Wallet({  });
    
        expect(wallet.getAddress()).toBeDefined();
        expect(wallet.getPrivateKey).toBeDefined();
        expect(wallet.getMnemonic()).toBeDefined();
    }, 60000);

    it('can generate same wallet', async () => {
        const wallet = new Wallet({ password: 'toor',  });

        expect(wallet.getAddress()).toEqual(address);
        expect(wallet.getPrivateKey()).toEqual(privateKey);
        expect(wallet.getMnemonic()).toEqual(mnemonic);
    }, 60000);

    it('can generate with PrivateKey', async () => {
        const wallet = new Wallet({ privateKey: privateKey,  });

        expect(wallet.getAddress()).toEqual(address);
        expect(wallet.getPrivateKey()).toEqual(privateKey);
    }, 60000);

    it('can generate with Mnemonic', async () => {
        const seed = mnemonicToSeedSync(mnemonic, "");

        const keypair = Keypair.fromSeed(seed.slice(0, 32));
        const wallet = new Wallet({ mnemonic: mnemonic });

        expect(wallet.getAddress()).toEqual(keypair.publicKey.toString());
        expect(wallet.getPrivateKey()).toEqual(Buffer.from(keypair.secretKey).toString('hex'));
        expect(wallet.getMnemonic()).toEqual(mnemonic);
    }, 60000);

    it('can get balance', async () => {
        const wallet = new Wallet({ password: 'toor' });

        expect(await wallet.getCoinBalance()).toEqual(0);
    }, 60000);

    it('can get token balance', async () => {
        const wallet = new Wallet({ password: 'toor' });

        expect(await wallet.getTokenBalance('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', address)).toEqual(0);
    }, 60000);

    it('can estimate sendCoin', async () => {
      const wallet = new Wallet({ password: 'toor' });
      const estimationResult = await wallet.estimateCostSendCoinTo('Cd5PHnve4rJDHBAGvXgJnouddALyX3NmbwN3s3MzvPBQ', 1);

      expect(estimationResult?.success).toBe(false);
      expect(estimationResult?.description).toMatch('insufficient funds');
    });

    it('can estimate sendToken', async () => {
      const wallet = new Wallet({ password: 'toor' });
      const estimationResult = await wallet.estimateCostSendTokenTo('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 'Cd5PHnve4rJDHBAGvXgJnouddALyX3NmbwN3s3MzvPBQ', 1);

      expect(estimationResult?.success).toBe(false);
      expect(estimationResult?.description).toMatch('insufficient funds');
    });
})