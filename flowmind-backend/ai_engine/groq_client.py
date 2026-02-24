import requests
from django.conf import settings


class GroqClient:
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL

    def chat(self, prompt, system=None, temperature=0.7, max_tokens=500):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            response = requests.post(
                self.BASE_URL,
                headers=headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content'].strip()

        except requests.exceptions.Timeout:
            return "AI response timed out. Please try again."
        except requests.exceptions.HTTPError as e:
            return f"Groq API error: {response.status_code}"
        except requests.exceptions.RequestException:
            return "AI service unavailable. Please try again later."
        except (KeyError, IndexError):
            return "Unexpected response from AI. Please try again."


groq = GroqClient()