class FinanceService {
  public async getTVL(): Promise<number> {
    const tvl = 5;

    return tvl;
  }

  public async getAPR(): Promise<number> {
    const apr = 0.54;

    return apr;
  }

  public async getAPY(): Promise<number> {
    const apy = 0.67;

    return apy;
  }
}

export default FinanceService;
