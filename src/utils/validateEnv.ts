import { cleanEnv, port, str } from 'envalid';

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    MORALIS_SERVER_URL: str(),
    MORALIS_APP_ID: str(),
    MORALIS_MASTER_KEY: str(),
  });
};

export default validateEnv;
