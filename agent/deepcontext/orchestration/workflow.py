"""LangGraph workflow for iterative research."""

from __future__ import annotations

import json
from datetime import date
from typing import Annotated, Any, Literal, TypedDict

from langchain.chat_models import init_chat_model
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.tools import StructuredTool
from langgraph.graph import START, StateGraph
from langgraph.graph.message import add_messages

from deepcontext.capabilities import SemanticMemory, WebResearch
from deepcontext.config import Settings
from deepcontext.contracts import ResearchResponse, Source
from deepcontext.exceptions import DependencyUnavailable
from deepcontext.instructions import research_instructions
from deepcontext.observability import langfuse_callbacks


class ResearchState(TypedDict):
    """State shared by research graph nodes."""

    messages: Annotated[list[BaseMessage], add_messages]
    iterations: int
    sources: list[dict[str, Any]]
    partial: bool


class ResearchWorkflow:
    """Tool-using research agent with bounded iteration."""

    def __init__(
        self,
        config: Settings,
        retrieval: SemanticMemory,
        web: WebResearch,
    ) -> None:
        self.config = config
        self.retrieval = retrieval
        self.web = web
        self.tools = self._build_tools()
        self.tool_map = {tool.name: tool for tool in self.tools}
        self.model = init_chat_model(
            config.chat_model,
            temperature=config.temperature,
        )
        self.tool_model = self.model.bind_tools(self.tools)
        self.callbacks = langfuse_callbacks()
        self.graph = self._build_graph()

    def _build_tools(self) -> list[StructuredTool]:
        async def semantic_search(query: str) -> list[dict[str, Any]]:
            """Search the existing semantic memory for relevant evidence."""

            return await self.retrieval.search(query)

        async def web_search(query: str) -> list[dict[str, Any]]:
            """Search the public web for current or missing evidence."""

            return await self.web.search(query)

        tools = [StructuredTool.from_function(coroutine=semantic_search)]
        if self.config.web_search_enabled:
            tools.append(StructuredTool.from_function(coroutine=web_search))
        return tools

    @staticmethod
    def _extract_sources(items: Any) -> list[dict[str, Any]]:
        if not isinstance(items, list):
            return []
        return [
            {
                "source": str(item.get("source", "unknown")),
                "title": item.get("title"),
                "url": item.get("url"),
                "chunk_id": item.get("chunk_id"),
            }
            for item in items
            if isinstance(item, dict) and item.get("source")
        ]

    async def _assistant(self, state: ResearchState) -> dict[str, Any]:
        iterations = state.get("iterations", 0) + 1
        messages = state["messages"]
        system = SystemMessage(
            content=research_instructions().format(date=date.today().isoformat())
        )
        if iterations >= self.config.max_iterations:
            final_instruction = HumanMessage(
                content=(
                    "Stop using tools and produce the best grounded final answer now."
                )
            )
            response = await self.model.ainvoke([system, *messages, final_instruction])
        else:
            response = await self.tool_model.ainvoke([system, *messages])
        return {"messages": [response], "iterations": iterations}

    async def _execute_tools(self, state: ResearchState) -> dict[str, Any]:
        last = state["messages"][-1]
        if not isinstance(last, AIMessage):
            return {"messages": [], "partial": True}

        messages: list[ToolMessage] = []
        sources = list(state.get("sources", []))
        partial = state.get("partial", False)
        for call in last.tool_calls:
            tool = self.tool_map.get(call["name"])
            try:
                if tool is None:
                    raise RuntimeError(f"Unknown tool: {call['name']}")
                result = await tool.ainvoke(call["args"])
                sources.extend(self._extract_sources(result))
                content = json.dumps(result, ensure_ascii=False, default=str)
            except DependencyUnavailable as exc:
                partial = True
                content = json.dumps({"error": exc.code, "message": exc.message})
            except Exception:
                partial = True
                content = json.dumps(
                    {"error": "tool_failed", "message": "The tool could not complete."}
                )
            messages.append(ToolMessage(content=content, tool_call_id=call["id"]))
        return {"messages": messages, "sources": sources, "partial": partial}

    def _route(self, state: ResearchState) -> Literal["tools", "__end__"]:
        last = state["messages"][-1]
        if (
            isinstance(last, AIMessage)
            and last.tool_calls
            and state["iterations"] < self.config.max_iterations
        ):
            return "tools"
        return "__end__"

    def _build_graph(self):
        builder = StateGraph(ResearchState)
        builder.add_node("assistant", self._assistant)
        builder.add_node("tools", self._execute_tools)
        builder.add_edge(START, "assistant")
        builder.add_conditional_edges("assistant", self._route)
        builder.add_edge("tools", "assistant")
        return builder.compile()

    async def research(self, query: str) -> ResearchResponse:
        """Execute the graph and normalize its terminal state."""

        state = await self.graph.ainvoke(
            {
                "messages": [HumanMessage(content=query)],
                "iterations": 0,
                "sources": [],
                "partial": False,
            },
            config={"callbacks": self.callbacks},
        )
        last = state["messages"][-1]
        answer = last.content if isinstance(last.content, str) else str(last.content)
        unique: dict[tuple[str, str | None], Source] = {}
        for raw in state.get("sources", []):
            source = Source.model_validate(raw)
            unique[(source.source, source.chunk_id)] = source
        return ResearchResponse(
            answer=answer,
            sources=list(unique.values()),
            status="partial" if state.get("partial") else "complete",
        )
