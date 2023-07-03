import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ethers } from 'ethers';
import crypto = require('crypto');
import { HttpService } from '@nestjs/axios';

export const ERC20_ABI = {
  abi: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function balanceOf(address account) public view returns (uint256 balance)',
    'function transfer(address _to, uint256 _value) public returns (bool success)',
    'function approve(address spender, uint256 amount) external returns (bool success)',
    'function allowance(address owner, address spender) external view returns (uint256 allowance)',
  ],
};

@Injectable()
export class WalletService {
  constructor(private readonly httpService: HttpService) {}
  public async generateAddress(): Promise<{
    wallet: ethers.Wallet;
    privateKey: string;
  }> {
    const id = crypto.randomBytes(32).toString('hex');
    const privateKey = '0x' + id;
    const wallet = new ethers.Wallet(privateKey);
    return {
      wallet,
      privateKey,
    };
  }

  public async getWalletTokenBalance(
    walletAddress: string,
    token: string,
  ): Promise<number> {
    try {
      const provider = new ethers.providers.InfuraProvider(
        process.env.CHAIN,
        process.env.INFURA_API_KEY,
      );
      const contract = new ethers.Contract(token, ERC20_ABI.abi, provider);
      const response = await contract.balanceOf(walletAddress);
      const balance = response.toNumber() / 10 ** 6;
      return balance;
    } catch (error) {
      throw new HttpException(error, 500);
    }
  }

  public async getFiatValue(crypto: string, amount: number, currency: string) {
    try {
      const coinMarketCapApiKey = process.env.COINMARKETCAP_API_KEY;

      if (!coinMarketCapApiKey) {
        throw new HttpException('COINMARKETCAP_API_KEY not found.', 400);
      }

      const fiatPrice = await this.fetchFiatPrice(crypto, currency);
      const fiatValue = amount * fiatPrice;
      const deviation = process.env.DEVIATION || 102;
      let deviatedPrice = fiatPrice;
      if (deviation) {
        deviatedPrice = this.calculateDeviatedPrice(
          fiatPrice,
          parseInt(deviation.toString()),
        );
      }

      return {
        fiatValue,
        price: deviatedPrice,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get fiat value.');
    }
  }

  private async fetchFiatPrice(symbol: string, currency: string) {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&convert=${currency}`;
    const response = await this.httpService
      .get(url, {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
        },
      })
      .toPromise();

    const data = response?.data?.data;
    if (!data || !data[symbol]) {
      throw new HttpException('Failed to fetch fiat price.', 400);
    }

    const quote = data[symbol].quote;
    const fiatPrice = quote[currency]?.price || 0;
    return fiatPrice;
  }

  private calculateDeviatedPrice(price: number, deviation: number) {
    const deviatedPrice = price * (deviation / 100);
    return deviatedPrice;
  }
}
