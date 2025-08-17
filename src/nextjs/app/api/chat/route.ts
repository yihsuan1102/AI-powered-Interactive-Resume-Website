export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const audience = typeof body?.audience === 'string' ? body.audience : undefined;
    const top_k = Number.isInteger(body?.top_k) ? body.top_k : 8;
    const match_threshold = typeof body?.match_threshold === 'number' ? body.match_threshold : 0.0;
    const doc_id = typeof body?.doc_id === 'string' ? body.doc_id : undefined;

    if (!message) {
      return new Response(
        JSON.stringify({ code: 'bad_request', message: '缺少必要欄位 message' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const backendUrl = process.env.RAG_BACKEND_URL || '';
    if (!backendUrl) {
      return new Response(
        JSON.stringify({ code: 'internal_error', message: '後端未設定 RAG_BACKEND_URL' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    const resp = await fetch(`${backendUrl}/rag/query`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.RAG_API_KEY ? { 'x-api-key': process.env.RAG_API_KEY } : {}),
      },
      body: JSON.stringify({
        question: message,
        audience,
        top_k,
        match_threshold,
        doc_id,
        include_context: true,
        generation_in_backend: true,
      }),
    });

    if (!resp.ok) {
      const errorPayload = await resp.json().catch(() => ({}));
      const status = resp.status || 500;
      // 後端若回傳 detail 物件（FastAPI），轉為扁平結構
      const detail = (errorPayload && errorPayload.detail) ? errorPayload.detail : errorPayload;
      const code = detail?.code || (status === 429 ? 'llm_quota_exceeded' : 'internal_error');
      const message = detail?.message || (status === 429 ? 'LLM 配額不足（insufficient_quota），請稍後再試' : 'RAG 後端錯誤');
      return new Response(
        JSON.stringify({ code, message }),
        { status, headers: { 'content-type': 'application/json' } }
      );
    }

    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ code: 'bad_request', message: '請求格式錯誤' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
}


