// Send the old domain to the canonical site so search engines see one copy.
const OLD_HOSTS = new Set(['systemsixpointnine.com', 'www.systemsixpointnine.com']);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (OLD_HOSTS.has(url.hostname)) {
    return Response.redirect(`https://www.system6point9.com${url.pathname}${url.search}`, 301);
  }
  return next();
}
