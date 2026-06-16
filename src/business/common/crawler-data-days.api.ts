import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { BusinessType } from '@model/user.types';
import log from '@src/utils/logger';

type CrawlerDataDayAction = 'crawl-start' | 'crawl-end';
export type CrawlerEndStatus = 'SUCCESS' | 'FAILED';

interface CrawlerDataDayRequest {
  loanSourceCode: string;
  date: string;
  status?: CrawlerEndStatus;
  reason?: string;
}

interface CrawlerDataDayResponse<T = any> {
  code?: number;
  status?: CrawlerEndStatus;
  reason?: string;
  msg?: string;
  message?: string;
  data?: T;
}

const CRAWLER_DATA_DAYS_PATH = '/loan/import/external/crawler-data-days';
const SYNC_PATH = '/loan/import/external/sync';

function getCrawlerDataDaysBaseURL(): string {
  const baseURL = process.env.WRITE_CASE_API_BASE_URL || '';
  if (!baseURL) {
    log.warn('[CrawlerDataDays] WRITE_CASE_API_BASE_URL is not set, crawler status API may fail');
    return '';
  }

  if (baseURL.includes(SYNC_PATH)) {
    return baseURL.slice(0, baseURL.indexOf(SYNC_PATH));
  }

  if (baseURL.includes(CRAWLER_DATA_DAYS_PATH)) {
    return baseURL.slice(0, baseURL.indexOf(CRAWLER_DATA_DAYS_PATH));
  }

  return baseURL.replace(/\/$/, '');
}

let crawlerDataDaysInstance: AxiosInstance | null = null;

function getCrawlerDataDaysInstance(): AxiosInstance {
  if (crawlerDataDaysInstance) {
    return crawlerDataDaysInstance;
  }

  crawlerDataDaysInstance = axios.create({
    timeout: 60000,
    baseURL: getCrawlerDataDaysBaseURL(),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  crawlerDataDaysInstance.interceptors.response.use(
    (response: AxiosResponse<CrawlerDataDayResponse>) => {
      const result = response.data;
      if (result?.code === 200 || result?.status === 'SUCCESS') {
        return result.data;
      }

      return Promise.reject(new Error(result?.reason || result?.msg || result?.message || 'crawler status request failed'));
    },
    (error: AxiosError) => Promise.reject(error)
  );

  return crawlerDataDaysInstance;
}

async function notifyCrawlerDataDay(
  action: CrawlerDataDayAction,
  businessType: BusinessType,
  date: string,
  status?: CrawlerEndStatus,
  reason?: string
): Promise<void> {
  const requestData: CrawlerDataDayRequest = {
    loanSourceCode: businessType,
    date,
  };
  if (status) {
    requestData.status = status;
  }
  if (reason) {
    requestData.reason = reason;
  }

  const endpoint = `${CRAWLER_DATA_DAYS_PATH}/${action}`;

  log.info(`[CrawlerDataDays] ${action} request: ${JSON.stringify(requestData)}`);
  await getCrawlerDataDaysInstance().post(endpoint, requestData);
  log.info(`[CrawlerDataDays] ${action} success for ${businessType} ${date}`);
}

export async function notifyCrawlerStart(businessType: BusinessType, date: string): Promise<void> {
  await notifyCrawlerDataDay('crawl-start', businessType, date);
}

export async function notifyCrawlerEnd(
  businessType: BusinessType,
  date: string,
  status: CrawlerEndStatus = 'SUCCESS',
  reason?: string
): Promise<void> {
  await notifyCrawlerDataDay('crawl-end', businessType, date, status, reason);
}
