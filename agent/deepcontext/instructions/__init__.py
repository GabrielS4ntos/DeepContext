"""Instruction loading."""

from importlib.resources import files


def research_instructions() -> str:
    """Load the system instructions for autonomous research."""

    return files(__package__).joinpath("research.md").read_text(encoding="utf-8")
