import { container } from './container';

/**
 * Application bootstrap.
 * Called once at startup to validate environment and warm up services.
 */
export async function bootstrap(): Promise<void> {
  const logger = container.getLogger('bootstrap');

  logger.info('Bootstrapping application...');

  // Validate required environment variables
  const required = ['DATABASE_URL', 'OPENAI_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.warn(`Missing environment variables: ${missing.join(', ')}. Some features may not work.`);
  }

  // Warm up cache
  container.cache;

  logger.info('Application bootstrapped successfully');
}
