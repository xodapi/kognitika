import { config } from 'dotenv';
import { resolve } from 'path';
import { createSafeLogger } from './safe-logger';

const logger = createSafeLogger('env');

config({ path: resolve(process.cwd(), '.env') });
logger.debug('Configuration loaded');
