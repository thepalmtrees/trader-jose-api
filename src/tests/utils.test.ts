import Utils from '@services/utils';

afterAll(async () => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
});

describe('Testing Utils', () => {
  test('wavax token address is 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', () => {
    expect(Utils.resolveTokenAddress('wavax')).toBe('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7');
  });

  test('random token address, returns the same token address', () => {
    expect(Utils.resolveTokenAddress('0x0000000000000000000000000000000000000001')).toBe('0x0000000000000000000000000000000000000001');
  });

  test('For a pool, given 24h volume is 100, its 24h fees is 0.25', () => {
    expect(Utils.calculatePoolFees24h(100)).toBe(0.25);
  });

  test('For a pool, given 24h fees is 100 and tvl is 100, its APR is 365', () => {
    expect(Utils.calculatePoolAPR(100, 100)).toBe(365);
  });

  test('For a pool, given tvl is zero, its APR is 0', () => {
    expect(Utils.calculatePoolAPR(100, 0)).toBe(0);
  });

  test('For a pool, given APY is 10, its APR is 2.4057891274819476', () => {
    expect(Utils.calculatePoolAPRFromAPY(10)).toBe(2.4057891274819476);
  });

  test('For a pool, given APR is 2.4057891274819476, its APY is 10', () => {
    expect(Utils.calculatePoolAPY(2.4057891274819476)).toBeCloseTo(10);
  });
});
