from pydantic import BaseModel, ConfigDict
from typing import Any, Optional, Generic, TypeVar

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    status: str
    message: str
    data: Optional[T] = None
    request_id: Optional[str] = None
