import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
import asyncio

load_dotenv()

async def test_gemini():
    print("Testing Gemini...")
    try:
        # Try different names
        for model_name in ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-flash-latest"]:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=os.getenv("GEMINI_API_KEY"),
                    temperature=0
                )
                res = await llm.ainvoke("hi")
                print(f"  SUCCESS with {model_name}: {res.content}")
                return model_name
            except Exception as e:
                print(f"  FAILED with {model_name}: {str(e)[:100]}")
    except Exception as e:
        print(f"Gemini test failed: {e}")
    return None

async def test_cerebras():
    print("\nTesting Cerebras...")
    try:
        # Try different names
        for model_name in ["llama3.1-8b", "llama3.1-70b", "llama-3.1-8b", "llama-3.1-70b"]:
            try:
                llm = ChatOpenAI(
                    model=model_name,
                    api_key=os.getenv("CEREBRAS_API_KEY"),
                    base_url="https://api.cerebras.ai/v1",
                    temperature=0
                )
                res = await llm.ainvoke("hi")
                print(f"  SUCCESS with {model_name}: {res.content}")
                return model_name
            except Exception as e:
                print(f"  FAILED with {model_name}: {str(e)[:100]}")
    except Exception as e:
        print(f"Cerebras test failed: {e}")
    return None

async def main():
    await test_gemini()
    await test_cerebras()

if __name__ == "__main__":
    asyncio.run(main())
