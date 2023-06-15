import { HttpException, Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import crypto = require('crypto');

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
}
