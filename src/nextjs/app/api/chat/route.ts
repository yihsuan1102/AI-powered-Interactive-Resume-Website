export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const input = typeof body?.input === 'string' ? body.input.trim() : '';

    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Missing input', message: '請提供文字輸入' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // 非串流 JSON 範例回覆（僅原型用途）
    const reply = `你剛剛說：「${input}」。這是非串流 JSON 的示範回覆。`;

    return new Response(
      JSON.stringify({ role: 'assistant', content: reply }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Bad Request' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
}


