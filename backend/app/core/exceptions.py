from fastapi import HTTPException, status

class PrepAIException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)

class AuthenticationError(PrepAIException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail)

class AuthorizationError(PrepAIException):
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(status.HTTP_403_FORBIDDEN, detail)

class ResourceNotFoundError(PrepAIException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, detail)
