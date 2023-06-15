import { Body, Controller, Post } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}
  @Post('generate')
  async generateAddress() {
    return this.walletService.generateAddress();
  }

  @Post('balance')
  async getWalletBalance(@Body() params: { address: string; token: string }) {
    const { address, token } = params;
    return this.walletService.getWalletTokenBalance(address, token);
  }
}
