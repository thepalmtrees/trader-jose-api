// moralis get moralis-admin-cli watch-cloud-folder --moralisApiKeypools cloud function
const JOE_TROLLER_ADDRESS = '0xdc13687554205e5b89ac783db14bb5bba4a1edac';
const secondsPerDay = 86400;
const daysPerYear = 365;
const _1E18 = Math.pow(10, 18);
Moralis.Cloud.job('syncLendingMetrics', async request => {
  // This will limit the number of requests for
  // unauthenticated users to 10 per minute (60000 ms) and 20 per minute for authenticated users.
  Moralis.settings.setAPIRateLimit({
    anonymous: 500,
    authenticated: 500,
    windowMs: 60000,
  });
  // params: passed in the job call
  // headers: from the request that triggered the job
  // log: the Moralis Server logger passed in the request
  // message: a function to update the status message of the job object
  const { params, headers, log, message } = request;
  message('I just started');
  log.info('Hello markets!');
  const marketAddresses = await getAllMarkets();
  log.info(`Found ${marketAddresses.length} markets`);
  const allMarketsMetrics = [];
  for (let i = 0; i < marketAddresses.length; i++) {
    const oneMarket = marketAddresses[i];
    logger.info(`Getting market metrics for ${oneMarket}`);
    try {
      const underlyingAddress = await getUnderlyingAddress(oneMarket);

      const symbol = await getUnderlyingSymbol(underlyingAddress);

      const httpResponse = await Moralis.Cloud.httpRequest({
        url: `https://trader-joe-2-api.herokuapp.com/priceusd/${underlyingAddress}`,
      });
      const tokenPriceInUSD = parseFloat(httpResponse.text) / _1E18;

      const underlyingDecimals = await getUnderlyingDecimals(underlyingAddress);
      const _1Edecimals = Math.pow(10, parseInt(underlyingDecimals));

      const exchangeRateStored = await getExchangeRateStored(oneMarket, _1Edecimals);

      const totalSupply = await getTotalSupply(oneMarket);

      const deposits = (totalSupply / _1E18) * exchangeRateStored;
      const depositsUSD = deposits * tokenPriceInUSD;

      const totalReserves = await getTotalReserves(oneMarket);
      const reservesUSD = (totalReserves / _1Edecimals) * tokenPriceInUSD;

      const cash = await getCash(oneMarket);

      const totalBorrows = await getTotalBorrows(oneMarket);
      const borrowsNative = totalBorrows / _1Edecimals;
      const borrowsUSD = borrowsNative * tokenPriceInUSD;

      const reserveFactorMantissa = await getReserveFactorMantissa(oneMarket);
      const reserveFactor = reserveFactorMantissa / _1Edecimals;

      let maybeCollateralFactor = await getMarketCollateralFactor(oneMarket, _1Edecimals);

      const borrowRatePerSecondBN = await getBorrowRatePerSecond(oneMarket);

      const borrowPerSecond = parseFloat(borrowRatePerSecondBN.toString()) / _1E18;

      const borrowAPY = (Math.pow(borrowPerSecond * secondsPerDay + 1, daysPerYear) - 1) * 100;

      const supplyRatePerSecondBN = await getSupplyRatePerSecond(oneMarket);

      const supplyPerSecond = parseFloat(supplyRatePerSecondBN.toString()) / _1E18;

      const supplyAPY = (Math.pow(supplyPerSecond * secondsPerDay + 1, daysPerYear) - 1) * 100;

      const utilizationRate = totalBorrows / (cash + totalBorrows - totalReserves);
      const liquidityNative = (cash - totalReserves) / _1Edecimals;
      const liquidityUSD = liquidityNative * tokenPriceInUSD;

      const marketMetrics = {
        address: oneMarket.toLowerCase(),
        deposits,
        depositsUSD,
        reservesUSD,
        borrowsNative,
        borrowsUSD,
        liquidityNative,
        liquidityUSD,
        utilizationRate,
        borrowAPY,
        supplyAPY,
        reserveFactor,
        maybeCollateralFactor,
        exchangeRateStored,
        totalSupply,
        symbol,
        underlyingDecimals,
      };
      allMarketsMetrics.push(marketMetrics);
      log.info(`Market ready ${oneMarket}`);
    } catch (e) {
      log.info(`Market ${oneMarket} failed `);
      log.info(e);
    }
  }

  const Market = Moralis.Object.extend('Market');
  const query = new Moralis.Query(Market);
  const alreadyStoredMarkets = await query.find();
  const alreadyStoredMarketAddresses = new Set(alreadyStoredMarkets.map(market => market.get('address')));

  const marketsToBeUpdated = allMarketsMetrics
    .filter(market => alreadyStoredMarketAddresses.has(market.address))
    .map(market => ({
      filter: { address: market.address },
      update: market,
    }));
  const marketsToBeCreated = allMarketsMetrics
    .filter(market => !alreadyStoredMarketAddresses.has(market.address))
    .map(market => ({
      update: market,
    }));
  Moralis.bulkUpdateMany('Market', marketsToBeUpdated);
  log.info(`${marketsToBeUpdated.length} markets updated`);
  Moralis.bulkWrite('Market', marketsToBeCreated);
  log.info(`${marketsToBeCreated.length} new markets saved`);

  message('I am done');
  return 1;
});

async function getSupplyRatePerSecond(oneMarket) {
  const supplyRatePerSecondFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'supplyRatePerSecond',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'supplyRatePerSecond',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const supplyRatePerSecondBN = await Moralis.Web3API.native.runContractFunction(supplyRatePerSecondFn);
  return supplyRatePerSecondBN;
}

async function getBorrowRatePerSecond(oneMarket) {
  const borrowRatePerSecondFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'borrowRatePerSecond',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'borrowRatePerSecond',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  return await Moralis.Web3API.native.runContractFunction(borrowRatePerSecondFn);
}

async function getMarketCollateralFactor(oneMarket, _1Edecimals) {
  const marketFn = {
    chain: 'avalanche',
    address: JOE_TROLLER_ADDRESS,
    function_name: 'markets',
    abi: [
      {
        constant: true,
        inputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        name: 'markets',
        outputs: [
          {
            internalType: 'bool',
            name: 'isListed',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'collateralFactorMantissa',
            type: 'uint256',
          },
          {
            internalType: 'enum JoetrollerV1Storage.Version',
            name: 'version',
            type: 'uint8',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
    params: { '': oneMarket },
  };
  try {
    const market = await Moralis.Web3API.native.runContractFunction(marketFn);
    return market.collateralFactorMantissa / _1Edecimals;
  } catch (e) {
    // do nothing
    console.log(e);
    return 0;
  }
}

async function getReserveFactorMantissa(oneMarket) {
  const reserveFactorMantissaFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'reserveFactorMantissa',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'reserveFactorMantissa',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const reserveFactorMantissa = parseInt(await Moralis.Web3API.native.runContractFunction(reserveFactorMantissaFn));
  return reserveFactorMantissa;
}

async function getTotalBorrows(oneMarket) {
  const totalBorrowsFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'totalBorrows',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'totalBorrows',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const totalBorrows = parseInt(await Moralis.Web3API.native.runContractFunction(totalBorrowsFn));
  return totalBorrows;
}

async function getCash(oneMarket) {
  const cashFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'getCash',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'getCash',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const cash = parseFloat(await Moralis.Web3API.native.runContractFunction(cashFn));
  return cash;
}

async function getTotalReserves(oneMarket) {
  const totalReservesFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'totalReserves',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'totalReserves',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const totalReserves = parseInt(await Moralis.Web3API.native.runContractFunction(totalReservesFn));
  return totalReserves;
}

async function getTotalSupply(oneMarket) {
  const totalSupplyFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'totalSupply',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'totalSupply',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const totalSupply = parseInt(await Moralis.Web3API.native.runContractFunction(totalSupplyFn));
  return totalSupply;
}

async function getExchangeRateStored(oneMarket, _1Edecimals) {
  const exchangeRateStoredFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'exchangeRateStored',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'exchangeRateStored',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const exchangeRateStored = parseFloat(await Moralis.Web3API.native.runContractFunction(exchangeRateStoredFn)) / _1Edecimals;
  return exchangeRateStored;
}

async function getUnderlyingDecimals(underlyingAddress) {
  const underlyingDecimalsFn = {
    chain: 'avalanche',
    address: underlyingAddress,
    function_name: 'decimals',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [
          {
            internalType: 'uint8',
            name: '',
            type: 'uint8',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const underlyingDecimals = await Moralis.Web3API.native.runContractFunction(underlyingDecimalsFn);
  return underlyingDecimals;
}

async function getUnderlyingSymbol(underlyingAddress) {
  const symbolFn = {
    chain: 'avalanche',
    address: underlyingAddress,
    function_name: 'symbol',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'symbol',
        outputs: [
          {
            internalType: 'string',
            name: '',
            type: 'string',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const symbol = await Moralis.Web3API.native.runContractFunction(symbolFn);
  return symbol;
}

async function getUnderlyingAddress(oneMarket) {
  const underlyingFn = {
    chain: 'avalanche',
    address: oneMarket,
    function_name: 'underlying',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'underlying',
        outputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };
  const underlyingAddress = await Moralis.Web3API.native.runContractFunction(underlyingFn);
  return underlyingAddress;
}

async function getAllMarkets() {
  const allMarketsFn = {
    chain: 'avalanche',
    address: JOE_TROLLER_ADDRESS,
    function_name: 'getAllMarkets',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'getAllMarkets',
        outputs: [
          {
            internalType: 'contract JToken[]',
            name: '',
            type: 'address[]',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  };

  const marketAddresses = Array.from(await Moralis.Web3API.native.runContractFunction(allMarketsFn));
  return marketAddresses;
}
