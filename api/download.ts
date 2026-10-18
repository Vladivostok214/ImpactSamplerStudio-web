export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('Parámetro url faltante', { status: 400 });
  }

  // Permitir descargas desde releases oficiales de GitHub
  if (!targetUrl.startsWith('https://github.com/Vladivostok214/ImpactSamplerStudio/releases/download/')) {
    return new Response('URL no permitida', { status: 403 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'ImpactSamplerStudio-Web-Proxy/1.0',
      },
    });

    if (!upstream.ok) {
      return new Response(`Error al obtener archivo: ${upstream.status} ${upstream.statusText}`, {
        status: upstream.status,
      });
    }

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Content-Type', 'application/octet-stream');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    const contentDisposition = upstream.headers.get('content-disposition');
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    }

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return new Response(`Error de proxy: ${err.message}`, { status: 500 });
  }
}
