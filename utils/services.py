# import requests
# from config.config import settings

# API_URL = settings.API_URL
# MODEL_NAME = settings.MODEL_NAME

# OLLAMA_TIMEOUT = 60  # seconds


# def call_model(prompt: str) -> str:
#     try:
#         res = requests.post(
#             API_URL,
#             json={
#                 "model": MODEL_NAME,
#                 "prompt": prompt,
#                 "stream": False,
#             },
#             timeout=OLLAMA_TIMEOUT,
#         )
#     except requests.exceptions.Timeout:
#         raise Exception("Ollama timed out — model may be overloaded. Please try again.")
#     except requests.exceptions.ConnectionError:
#         raise Exception("Cannot reach Ollama — make sure it is running.")

#     if res.status_code != 200:
#         raise Exception(f"Ollama error {res.status_code}: {res.text}")

#     data = res.json()
#     if "response" not in data:
#         raise Exception(f"Unexpected Ollama response shape: {data}")

#     return data["response"].strip()

import os
from ollama import Client, ResponseError
from config.config import settings

_client = Client(
    host="https://ollama.com",
    headers={"Authorization": "Bearer " + settings.OLLAMA_API_KEY},
)


def call_model(prompt: str) -> str:
    try:
        response = _client.chat(
            model=settings.MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            stream=False,
        )
    except ResponseError as e:
        raise Exception(f"Ollama cloud error {e.status_code}: {e.error}")
    except Exception as e:
        raise Exception(f"Ollama request failed: {str(e)}")

    content = response.message.content
    if not content:
        raise Exception("Empty response from Ollama cloud.")

    return content.strip()