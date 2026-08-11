from deepcontext.orchestration.workflow import ResearchWorkflow


def test_source_extraction_ignores_invalid_items() -> None:
    assert ResearchWorkflow._extract_sources([{"source": "a"}, {}, "invalid"]) == [
        {"source": "a", "title": None, "url": None, "chunk_id": None}
    ]
