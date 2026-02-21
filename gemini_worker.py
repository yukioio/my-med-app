import os
from google import genai
from upstash_redis import Redis
from dotenv import load_dotenv

# .env読み込み
load_dotenv()

# Redis設定
redis = Redis(
    url=os.getenv("UPSTASH_REDIS_REST_URL"),
    token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
)

# 最新のGenAIクライアント設定
client = genai.Client(api_key="AIzaSyCa382N8l14IPtn39EKWGqftU06UMTNfRs")

def start_ai_response(prompt, session_id):
    redis_key = f"chat:list:{session_id}"
    
    print("AIが回答を生成中...")
    
    # ストリーミングで回答取得
    response = client.models.generate_content_stream(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    
    for chunk in response:
        if chunk.text:
            # Redisに保存
            redis.rpush(redis_key, chunk.text)
            print(f"送信中: {chunk.text}")
    
    # 終了合図
    redis.rpush(redis_key, "[DONE]")
    print("すべての回答を送信しました！")

if __name__ == "__main__":
    # ブラウザの画面と合わせるためのテスト用
    user_input = "お腹が痛い時の対処法を教えて"
    test_id = "test-123" 
    
    start_ai_response(user_input, test_id)