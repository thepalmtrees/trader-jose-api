import request from 'supertest';
import App from '@/app';
import V2Route from '@routes/v2/v2.route';

jest.mock('moralis/node');

const mockedPool1 = {
  address: '0xa389f9430876455c36478deea9769b7ca4e3ddb1',
  token0: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
  token0Symbol: 'USDC.e',
  token1: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  token1Symbol: 'WAVAX',
  volume24hs: 52419408,
  tvl: 210551472,
  apr: 0.2271782255694703,
  apy: 0.2549648401002036,
  fees24hs: 131048.52,
};

const mockedPool2 = {
  address: '0x781655d802670bba3c89aebaaea59d3182fd755d',
  token0: '0x130966628846bfd36ff31a822705796e8cb8c18d',
  token0Symbol: 'MIM',
  token1: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  token1Symbol: 'WAVAX',
  volume24hs: 45974032,
  tvl: 188973840,
  apr: 0.22199529945520502,
  apy: 0.24848125592122794,
  fees24hs: 114935.08,
};

const mockedPools = {
  offset: 10,
  limit: 20,
  pools: [mockedPool1, mockedPool2],
};

jest.mock('@/services/pool.service', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getPoolsFromCovalent: jest.fn(() => {
        return mockedPools;
      }),
      getPoolFromCovalent: jest.fn(() => mockedPool1),
      getPoolsFromTheGraph: jest.fn(() => {
        return mockedPools;
      }),
      getPoolFromTheGraph: jest.fn(() => mockedPool1),
    };
  });
});

const mockedFarm1 = {
  id: '39',
  pair: '0xa389f9430876455c36478deea9769b7ca4e3ddb1',
  masterchef: '0xd6a4f121ca35509af06a0be99093d08462f53052',
  token0Name: 'USDC.e',
  token0: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
  token1Name: 'WAVAX',
  token1: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  tvl: 204224000,
  apy: 0.14001180458801,
  apr: 0.13106214215078849,
};
const mockedFarm2 = {
  id: '28',
  pair: '0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256',
  masterchef: '0xd6a4f121ca35509af06a0be99093d08462f53052',
  token0Name: 'WAVAX',
  token0: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  token1Name: 'USDT.e',
  token1: '0xc7198437980c041c805a1edcba50c1ce5db95118',
  tvl: 143142000,
  apy: 0.16343879062449,
  apr: 0.1514114904335495,
};

const mockedFarms = {
  offset: 10,
  limit: 20,
  farms: [mockedFarm1, mockedFarm2],
};

jest.mock('@/services/farm.service', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getFarmsFromTheGraph: jest.fn(() => mockedFarms),
      getFarmsFromYieldMonitor: jest.fn(() => mockedFarms),
      getFarmFromTheGraph: jest.fn(() => mockedFarm1),
      getFarmFromYieldMonitor: jest.fn(() => mockedFarm1),
    };
  });
});

jest.mock('@/services/stake.service', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getTotalStakedUSD: jest.fn(() => 10),
      getOneDayFees: jest.fn(() => 20),
      getAPR: jest.fn(() => 30),
      getAPY: jest.fn(() => 40),
    };
  });
});

afterAll(async () => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
});

describe('Testing v2/', () => {
  describe('[GET] /pools', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);
      return request(app.getServer()).get('/v2/pools').expect(200).expect(mockedPools);
    });
  });

  describe('[GET] /pools?source=thegraph', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer()).get('/v2/pools?source=thegraph').expect(200).expect(mockedPools);
    });
  });

  describe('[GET] /pools/:token1/:token2', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer())
        .get('/v2/pools/0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664/0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7')
        .expect(200)
        .expect(mockedPool1);
    });
  });

  describe('[GET] /pools/:token1/:token2?source=thegraph', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer())
        .get('/v2/pools/0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664/0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7?source=thegraph')
        .expect(200)
        .expect(mockedPool1);
    });
  });

  describe('[GET] /farms', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer()).get('/v2/farms').expect(200).expect(mockedFarms);
    });
  });

  describe('[GET] /farms?source=thegraph', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer()).get('/v2/farms?source=thegraph').expect(200).expect(mockedFarms);
    });
  });

  describe('[GET] /farms/:farmId', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer()).get('/v2/farms/0xa389f9430876455c36478deea9769b7ca4e3ddb1').expect(200).expect(mockedFarm1);
    });
  });

  describe('[GET] /farms/:farmId?source=thegraph', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer()).get('/v2/farms/0xa389f9430876455c36478deea9769b7ca4e3ddb1?source=thegraph').expect(200).expect(mockedFarm1);
    });
  });

  describe('[GET] /stake', () => {
    it('response statusCode 200', () => {
      const route = new V2Route();
      const app = new App([route]);

      return request(app.getServer()).get('/v2/stake').expect(200).expect({
        totalStakedUSD: 10,
        oneDayFees: 20,
        apr24h: 30,
        apy24h: 40,
        apyAverage: 0,
        apr7d: 0,
      });
    });
  });
});
