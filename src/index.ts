export interface Env {
  API_ENDPOINT: string
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return handleRequest(request, env);
  }
}

/**
 * リクエストを処理し、HTTP APIにプロキシしてHTTPSで応答
 * @param {Request} request - クライアントからのリクエスト
 * @returns {Promise<Response>}
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  // CORSプリフライトリクエストの処理
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
  
  try {
    // リクエストURLを取得して転送先URLを作成
    const HTTP_API_ENDPOINT = env.API_ENDPOINT;
    const url = new URL(request.url);
    const apiUrl = `${HTTP_API_ENDPOINT}${url.pathname}${url.search}`;
    
    console.log(`Relaying request to: ${apiUrl}`);
    
    // ヘッダーをコピー
    const requestHeaders = new Headers(request.headers);
    
    // ホストヘッダーを更新
    const apiHost = new URL(HTTP_API_ENDPOINT).host;
    requestHeaders.set('Host', apiHost);
    
    // オリジナルの接続情報を削除（Cloudflareが管理するため）
    requestHeaders.delete('Connection');
    requestHeaders.delete('Upgrade-Insecure-Requests');

    let requestBody;
    const contentType = request.headers.get('Content-Type') || '';
    
    // JSON形式のボディ処理
    if (contentType.includes('application/json')) {
      const jsonData = await request.json();
      requestBody = JSON.stringify(jsonData);
    } else {
      requestBody = await request.arrayBuffer();
    }
    
    // 新しいリクエストを作成
    const apiRequest = (() => {
      if (request.method === 'GET' || request.method === 'HEAD') {
        return new Request(apiUrl, {
          method: request.method,
          headers: requestHeaders,
          redirect: 'follow'
        })
      } else {
        return new Request(apiUrl, {
          method: request.method,
          headers: requestHeaders,
          body: requestBody,
          redirect: 'follow'
        })
      }
    })();
    
    // HTTP APIへリクエストを送信
    const response = await fetch(apiRequest);
    
    // レスポンスヘッダーを準備
    const responseHeaders = new Headers(response.headers);
    
    // セキュリティヘッダーを追加
    responseHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    
    // CORS関連のヘッダーを設定
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    // Content-Security-Policyを設定（必要に応じて）
    responseHeaders.set('Content-Security-Policy', "default-src 'self'; upgrade-insecure-requests;");
    
    // レスポンスを返す
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Relay error:', error);
    
    // エラー応答
    return new Response('API中継エラー', {
      status: 502,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
  
/**
 * CORSプリフライトリクエストを処理
 * @param {Request} request - クライアントからのリクエスト
 * @returns {Response|null} - CORSレスポンスまたはnull
 */
function handleCors(request: Request): Response|null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }
  return null;
}
