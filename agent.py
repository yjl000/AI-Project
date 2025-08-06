from browser_use.llm import ChatOpenAI
from browser_use import Agent
from dotenv import load_dotenv
load_dotenv()

import asyncio
import os

llm = ChatOpenAI(
    model='deepseek-r1',
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
  )

async def main():
    agent = Agent(
        task="打开百度，搜索“百炼大模型”，不要分析和总结，直接运行搜索",
        llm=llm,
    )
    result = await agent.run()
    print(result)

asyncio.run(main())