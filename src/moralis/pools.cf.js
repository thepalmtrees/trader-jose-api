// moralis get moralis-admin-cli watch-cloud-folder --moralisApiKeypools cloud function
Moralis.Cloud.job('syncCovalentPools', async request => {
  // params: passed in the job call
  // headers: from the request that triggered the job
  // log: the Moralis Server logger passed in the request
  // message: a function to update the status message of the job object
  const { params, headers, log, message } = request;
  message('I just started');
  log.info('Hello!');
  const chainId = '43114';
  const exchange = 'traderjoe';
  const quoteCurrency = 'USD';
  const pageSize = 1600;
  const pageNumber = 0;
  const config = await Moralis.Config.get({ useMasterKey: true });
  const covalentKey = config.get('covalent_key');
  const response = await Moralis.Cloud.httpRequest({
    url: `https://api.covalenthq.com/v1/${chainId}/xy=k/${exchange}/pools/?quote-currency=${quoteCurrency}&format=JSON&page-size=${pageSize}&page-number=${pageNumber}&key=${covalentKey}`,
  });
  if (response.status !== 200) {
    message('Sorry, I have failed you.');
    throw new Error(`Covalent request failed with status ${response.status}`);
  }
  const data = JSON.parse(response.text).data;
  const pools = data.items;
  log.info(`Got ${pools.length} from covalent`);

  // 1. fetch all pools in the DB
  const Pool = Moralis.Object.extend('Pool');
  const query = new Moralis.Query(Pool);
  const poolAddresses = pools.map(pool => pool.exchange);
  query.containedIn('exchange', poolAddresses);
  query.select('exchange');
  query.limit(10000);
  const alreadyStoredPools = await query.find();
  const alreadyStoredPoolsAddresses = new Set(alreadyStoredPools.map(pool => pool.get('exchange')));
  log.info(`Got ${alreadyStoredPoolsAddresses.length} saved pools...`);

  // 2. For each row in 1: bulkUpdateMany
  const poolsToUpdate = pools
    .filter(pool => alreadyStoredPoolsAddresses.has(pool.exchange))
    .map(pool => ({
      filter: { exchange: pool.exchange },
      update: pool,
    }));
  Moralis.bulkUpdateMany('Pool', poolsToUpdate);
  log.info(`${poolsToUpdate.length} pools updated`);

  // 3. For the rest: bulkWrite
  const poolsToWrite = pools
    .filter(pool => !alreadyStoredPoolsAddresses.has(pool.exchange))
    .map(pool => ({
      update: pool,
    }));
  Moralis.bulkWrite('Pool', poolsToWrite);
  log.info(`${poolsToWrite.length} new pools saved`);
  message('I am done');
  return 1;
});
