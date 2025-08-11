import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const { stream, handlers } = LangChainStream();

  const llm = new ChatOpenAI({
    streaming: true,
    callbacks: [handlers],
  });

  llm
    .invoke(
      (messages as Message[]).map((m) =>
        m.role == 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      ),
    )
    .catch(console.error);

  return new StreamingTextResponse(stream);
}
