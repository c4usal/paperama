"""Card TLDR via sumy (LexRank). https://github.com/miso-belica/sumy"""

from __future__ import annotations

import re

from sumy.nlp.stemmers import Stemmer
from sumy.nlp.tokenizers import Tokenizer
from sumy.parsers.plaintext import PlaintextParser
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.utils import get_stop_words

LANGUAGE = "english"
MIN_WORDS = 40


def _strip_markup(text: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def summarize_text(text: str, sentences: int = 2) -> str | None:
    normalized = _strip_markup(text)
    if len(normalized.split()) < MIN_WORDS:
        return normalized if normalized else None

    parser = PlaintextParser.from_string(normalized, Tokenizer(LANGUAGE))
    summarizer = LexRankSummarizer(Stemmer(LANGUAGE))
    summarizer.stop_words = get_stop_words(LANGUAGE)

    try:
        summary_sentences = summarizer(parser.document, max(1, min(sentences, 4)))
    except ValueError:
        return normalized[:280] + ("…" if len(normalized) > 280 else "")

    summary = " ".join(str(sentence) for sentence in summary_sentences).strip()
    return summary or None
