"""Application exceptions."""


class DependencyUnavailable(RuntimeError):
    """A research dependency could not serve the request."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
