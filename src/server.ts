process.env['NODE_CONFIG_DIR'] = __dirname + '/configs';

import 'dotenv/config';
import App from '@/app';
import V1Route from '@routes/v1/v1.route';
import V2Route from '@routes/v2/v2.route';
import validateEnv from '@utils/validateEnv';

validateEnv();

const app = new App([new V1Route(), new V2Route()]);

app.listen();
