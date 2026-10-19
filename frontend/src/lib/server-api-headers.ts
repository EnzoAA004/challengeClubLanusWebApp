type ServerApiHeadersOptions = {
  accept?: string;
  contentType?: string;
  sessionCookie?: string;
};

export function createServerApiHeaders(options: ServerApiHeadersOptions = {}): Headers {
  const headers = new Headers();
  if (options.accept) headers.set('accept', options.accept);
  if (options.contentType) headers.set('content-type', options.contentType);
  if (options.sessionCookie) headers.set('cookie', options.sessionCookie);

  // This value is configured only for Preview deployments and stays on the server.
  const protectionBypassSecret = process.env.API_PREVIEW_BYPASS_SECRET;
  if (protectionBypassSecret) headers.set('x-vercel-protection-bypass', protectionBypassSecret);

  return headers;
}
