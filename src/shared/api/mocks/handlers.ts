import { http, HttpResponse } from 'msw';

const notImplemented = () =>
  HttpResponse.json(
    {
      status: 'error',
      data: {},
      message: 'This demo endpoint has not been configured yet.',
      request_id: 'demo_unconfigured',
    },
    { status: 501 },
  );

/** Add feature handlers here; page data should remain outside component modules. */
export const handlers = [http.all('/api/v1/*', notImplemented)];
