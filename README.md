# New Trader Joe API

A brand new Trader Joe API

## Before doing anything.

```bash
npm install --global yarn
```

```bash
yarn install
```

### To start the API server

```bash
yarn dev
```

### To run some e2e tests.

For now, it's just a dummy test.

```bash
yarn test
```

### Or use the lovely make file

```bash
make build tag=1.0
```

or 

```bash
make run port=3000 name=trader-jose-api tag=1.0
```

### Moralis Cloud Function

When changing the cloud function, remember to run 
```
moralis-admin-cli watch-cloud-folder --moralisApiKey {MORALIS_API_KEY} --moralisApiSecret {MORALIS_API_SECRET} --moralisSubdomain {MORALIS_SUBDOMAIN} --autoSave 1 --moralisCloudfolder src/moralis/
```
so that the code is in sync with what you have in your laptop. 

