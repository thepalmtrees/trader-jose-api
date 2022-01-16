import request from 'supertest';
import App from '@/app';
import V1Route from '@routes/v1/v1.route';

jest.mock('moralis/node');

jest.mock('@/services/legacyjoe.service');
jest.mock('@/services/legacyjoe.service', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getCirculatingSupply: jest.fn(() => '1'),
      getCirculatingSupplyAdjusted: jest.fn(() => '2'),
      getTotalSupply: jest.fn(() => '3'),
      getLendingTotalSupply: jest.fn(() => '4'),
      getLendingTotalBorrow: jest.fn(() => '5'),
      getMaxSupply: jest.fn(() => '6'),
      getNftHat: jest.fn((hatId: string) => ({
        id: hatId,
        external_url: `https://api.traderjoexyz.com/nft/hat/${hatId}`,
        name: `Joe Hat NFT #${hatId}`,
        description: 'Redeemed a real HAT and burned 1 $HAT',
        image: 'https://ipfs.io/ipfs/QmaYPV2VKW5vHtD92m8h9Q4YFiukFx2fBWPAfCWKg6513s',
      })),
    };
  });
});

jest.mock('@/services/price.service');
jest.mock('@/services/price.service', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getPriceAVAX: jest.fn(() => '10'),
      getPriceUSD: jest.fn(() => '20'),
    };
  });
});

afterAll(async () => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
});

describe('Testing v1/', () => {
  describe('[GET] /', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);

      return request(app.getServer()).get('/status').expect(200);
    });
  });

  describe('[GET] /status', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);

      return request(app.getServer()).get('/status').expect(200).expect({ status: 'OK' });
    });
  });

  describe('[GET] /supply/circulating', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/supply/circulating').expect(200).expect('1');
    });
  });

  describe('[GET] /supply/circulating-adjusted', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/supply/circulating-adjusted').expect(200).expect('2');
    });
  });

  describe('[GET] /supply/total', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/supply/total').expect(200).expect('3');
    });
  });

  describe('[GET] /supply/max', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/supply/max').expect(200).expect('6');
    });
  });

  describe('[GET] /nft/hat', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/nft/hat').expect(200);
    });
  });

  describe('[GET] /nft/hat/:id', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/nft/hat/1').expect(200).expect({
        id: '1',
        external_url: 'https://api.traderjoexyz.com/nft/hat/1',
        name: 'Joe Hat NFT #1',
        description: 'Redeemed a real HAT and burned 1 $HAT',
        image: 'https://ipfs.io/ipfs/QmaYPV2VKW5vHtD92m8h9Q4YFiukFx2fBWPAfCWKg6513s',
      });
    });
  });

  describe('[GET] /priceavax/:tokenAddress', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/priceavax/1').expect(200).expect('10');
    });
  });

  describe('[GET] /priceusd/:tokenAddress', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/priceusd/2').expect(200).expect('20');
    });
  });

  describe('[GET] /lending/supply', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/lending/supply').expect(200).expect('4');
    });
  });

  describe('[GET] /lending/borrow', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route]);
      return request(app.getServer()).get('/lending/borrow').expect(200).expect('5');
    });
  });
});
