from deepcontext.config import Settings


def test_defaults_are_generic() -> None:
    config = Settings(_env_file=None)
    assert config.app_name == "DeepContext"
    assert config.qdrant_collection == "deepcontext"
    assert config.max_iterations == 8


def test_default_vector_is_supported() -> None:
    config = Settings(_env_file=None, qdrant_vector_name="")
    assert not config.qdrant_vector_name
