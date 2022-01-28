import ensureClient from './ensureClient';

import {db, UpdateState} from '../models/db'

interface Props {
    account: string;
    resource: string;
    googleResource: (arg0: any) => any;
    transformation: (arg0: any) => any;
    table: any;
    request: Object;
}

async function fetchList({account, resource, googleResource, transformation, table, request}: Props) {
        const key = [account, resource];

        const updateState = (await db.updateState.get(key)) || {account: account, resource: resource} as UpdateState;

        const currentRequest = {...request, 
            pageToken: updateState.nextPageToken,
            syncToken: updateState.nextSyncToken,
        };
        do {
          await db.updateState.update(key, {requestedAt: Date.now()});
          await ensureClient();
          const gapi: any = (window as any).gapi;

          console.log(`${resource} requesting`, JSON.stringify(currentRequest));
          let response = await googleResource(gapi).list(currentRequest)
          console.log(`${resource} response`, response);
            const result = response.result;

          const transformed = result.items.map(transformation)
          console.log(`${resource} found new ${transformed.length}`)

          await table.bulkPut(transformed);
          console.log(`${resource} updating state`, Date.now());

          await db.updateState.put({
              account: account,
              resource: resource,
              nextSyncToken: result?.nextSyncToken,
              nextPageToken: result?.nextPageToken,
              etag: result?.etag,
              updatedAt: Date.now(),
          });

          currentRequest.pageToken = result.nextPageToken;
          currentRequest.syncToken = result.nextSyncToken;
          console.log(`${resource} next request`, currentRequest);
        } while (currentRequest.pageToken != null);
}

export default fetchList;
