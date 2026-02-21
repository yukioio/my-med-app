import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// 既に .env は残っているはずなので、これで繋がります
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    const stream = new ReadableStream({
      async start(controller) {
        const interval = setInterval(async () => {
          try {
            // REST方式でデータを取り出す
            const chunk = await redis.lpop(`chat:list:${sessionId}`);
            if (chunk) {
              if (chunk === '[DONE]') {
                clearInterval(interval);
                controller.close();
              } else {
                controller.enqueue(new TextEncoder().encode(chunk as string));
              }
            }
          } catch (err) {
            clearInterval(interval);
            controller.error(err);
          }
        }, 100);

        req.signal.addEventListener('abort', () => clearInterval(interval));
      }
    });

    return new Response(stream);
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}