import ensureClient from './ensureClient';

import { db } from '../models/db';
import { UpdateState } from '../models/types';
import { trigger } from '../lib/dispatcher';

interface Props {
  account: string;
  resource: string;
  googleResource: (arg0: any) => any;
  transformation: (arg0: any) => any;
  table: any;
  request: Object;
}

async function fetchList({
  account,
  resource,
  googleResource,
  transformation,
  table,
  request,
}: Props) {
  const key = [account, resource];
  console.log(`Attempting fetch key ${key}`);

  let updateState =
    (await db.updateState.get(key)) ||
    ({ account: account, resource: resource } as UpdateState);

  const currentRequest = {
    ...request,
    pageToken: updateState.nextPageToken,
    syncToken: updateState.nextSyncToken,
    resyncRequired: undefined,
  };

  await ensureClient();
  const gapi: any = (window as any).gapi;

  async function doRequest(req: typeof currentRequest) {
    try {
      return await googleResource(gapi).list(currentRequest);
    } catch (e) {
      if ([410].includes((e as any)?.result?.error?.code)) {
        console.log(`Full sync required ${key}`, e);
        return {
          result: {
            items: [],
            nextSyncToken: undefined,
            nextPageToken: undefined,
            etag: undefined,
            resyncRequired: true,
          },
        };
      }

      throw e;
    }
  }

  try {
    do {
      console.log(`Attempting to fetch key ${key}`);
      await db.updateState.update(key, {
        requestedAt: Date.now(),
        requesting: true,
        error: undefined,
      });

      console.log(`${resource} requesting`, JSON.stringify(currentRequest));
      let response = await doRequest(currentRequest);
      console.log(`${resource} response`, response);
      const result = response.result;

      const transformed = result.items.map(transformation);
      console.log(`${resource} found new ${transformed.length}`);

      await db.transaction('rw', [table, db.updateState], async (_tx) => {
        await table.bulkPut(transformed);

        const newUpdateState = {
          account: account,
          resource: resource,
          resyncRequired: result.resyncRequired,
          nextSyncToken: result.nextSyncToken,
          nextPageToken: result.nextPageToken,
          etag: result.etag,
          updatedAt: Date.now(),
        };

        console.log(`${resource} updating state`, newUpdateState);
        await db.updateState.put(newUpdateState);

        trigger('fetchList:update', {
          newUpdateState,
          previousUpdateState: updateState,
          pageResponse: transformed,
        });

        updateState = newUpdateState;
      });

      currentRequest.pageToken = result.nextPageToken;
      currentRequest.syncToken = result.nextSyncToken;
      currentRequest.resyncRequired = result.resyncRequired;
      console.log(`${resource} next request`, currentRequest);
    } while (currentRequest.pageToken != null || currentRequest.resyncRequired);
    await db.updateState.update(key, {
      requesting: false,
      error: undefined,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.log('Error', e);

    const newUpdatePartial = {
      requesting: false,
      error: (e as any)?.message ?? `An error occured ${JSON.stringify(e)}`,
      updatedAt: Date.now(),
    };
    await db.updateState.update(key, newUpdatePartial);

    trigger('fetchList:update', {
      previousUpdateState: updateState,
      newUpdateState: {
        ...updateState,
        ...newUpdatePartial,
      },
      error: e,
    });

    if ([401, 403].includes((e as any)?.result?.error?.code)) {
      console.log('Authentication', e);
      window.localStorage.setItem(
        'googleToken',
        JSON.stringify((e as any).result),
      );
    }

    throw e;
  }
}

export default fetchList;
