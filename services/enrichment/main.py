"""Paperama enrichment API — sumy summaries + crawl4ai figure URL discovery."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from figures import extract_hero_image_url
from summarize import summarize_text

app = FastAPI(title="Paperama Enrichment", version="0.1.0")


class SummarizeRequest(BaseModel):
    text: str = Field(min_length=1)
    sentences: int = Field(default=2, ge=1, le=4)


class FiguresRequest(BaseModel):
    url: str = Field(min_length=8)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/summarize")
def summarize_endpoint(body: SummarizeRequest) -> dict[str, str | None]:
    summary = summarize_text(body.text, body.sentences)
    return {"summary": summary}


@app.post("/figures")
async def figures_endpoint(body: FiguresRequest) -> dict[str, str | list[str] | None]:
    hero, candidates = await extract_hero_image_url(body.url)
    return {"heroImageUrl": hero, "candidates": candidates}
