from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv

load_dotenv()

def check_content_type():
    from langchain_core.prompts import ChatPromptTemplate
    prompt = ChatPromptTemplate.from_template("Search for {query}")
    formatted = prompt.format_prompt(query="test")
    messages = formatted.to_messages()
    last_msg = messages[-1]
    print(f"Content: {last_msg.content}")
    print(f"Type: {type(last_msg.content)}")
    print(f"Is instance str: {isinstance(last_msg.content, str)}")
    print(f"Is instance list: {isinstance(last_msg.content, list)}")

if __name__ == "__main__":
    check_content_type()
