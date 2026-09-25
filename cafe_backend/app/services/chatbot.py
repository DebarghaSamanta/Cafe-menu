import json

from groq import Groq

from app.config import settings
from app.services.menu_tools import (
    TOOL_DEFINITIONS,
    TOOL_DISPATCH,
)

MAX_TOOL_CALLS_PER_TURN = 3

SYSTEM_PROMPT = """
You are a friendly guide for a cafe's digital menu, helping customers
who may not know exactly what they want yet.

Rules:
- Always use the search_menu tool to look up items before recommending
  anything. Never state a price, name, or availability that did not
  come from a tool result.
- If the request is vague (e.g. "something light"), ask ONE short
  clarifying question, or make a reasonable first guess with the tool
  and mention you can narrow it down further.
- If search_menu returns no results, say so plainly and suggest
  loosening the price range or trying a different dish or taste.
- Keep replies short and conversational (2-4 sentences). Do not list
  raw item IDs or JSON in your reply - the app shows item cards
  separately.
- Only recommend items that are available.
"""

# Simple in-memory session store: session_id -> list of chat messages.
# Fine for a single-process dev/demo server; swap for a DB collection
# if you need it to survive restarts or run across multiple workers.
_sessions: dict[str, list[dict]] = {}

_client: Groq | None = None


def _get_client() -> Groq:
    global _client

    if _client is None:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")

        _client = Groq(api_key=settings.groq_api_key)

    return _client


def _get_history(session_id: str) -> list[dict]:
    if session_id not in _sessions:
        _sessions[session_id] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

    return _sessions[session_id]


def run_chat_turn(db, session_id: str, user_message: str) -> dict:
    client = _get_client()
    history = _get_history(session_id)

    history.append({"role": "user", "content": user_message})

    last_tool_items: list[dict] = []

    for _ in range(MAX_TOOL_CALLS_PER_TURN):
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=history,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.4,
        )

        choice = response.choices[0].message

        if not choice.tool_calls:
            history.append(
                {"role": "assistant", "content": choice.content}
            )
            return {
                "reply": choice.content,
                "recommended_items": last_tool_items,
            }

        history.append(
            {
                "role": "assistant",
                "content": choice.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in choice.tool_calls
                ],
            }
        )

        for tool_call in choice.tool_calls:
            tool_name = tool_call.function.name

            try:
                arguments = json.loads(
                    tool_call.function.arguments or "{}"
                )
            except json.JSONDecodeError:
                arguments = {}

            tool_fn = TOOL_DISPATCH.get(tool_name)

            if tool_fn is None:
                result = {"error": f"Unknown tool: {tool_name}"}
            else:
                result = tool_fn(db, **arguments)

            if tool_name == "search_menu":
                last_tool_items = result.get("items", [])

            history.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )

    fallback = (
        "I found a few options below - take a look, or tell me a bit "
        "more about what you're craving."
    )
    history.append({"role": "assistant", "content": fallback})

    return {"reply": fallback, "recommended_items": last_tool_items}