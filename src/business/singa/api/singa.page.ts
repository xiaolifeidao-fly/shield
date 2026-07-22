import { getPage } from '@src/business/common/engine.manager';
import { Page } from 'playwright-core';

export const SINGA_REQUEST_TIMEOUT_MS = 60 * 1000;

export async function getSingaPage(resourceId: string, url: string): Promise<Page | undefined> {
  return await getPage(resourceId, url, SINGA_REQUEST_TIMEOUT_MS) as unknown as Page | undefined;
}
