from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z\s\-']+$", description="Only letters, spaces, hyphens, and apostrophes are allowed.")
    email: EmailStr = Field(..., max_length=100)
    password: str = Field(..., min_length=6, max_length=100, pattern=r"^[^\s;'\"]+$", description="Password cannot contain spaces, semicolons, or quotes.")

    @field_validator("name", mode="before")
    def strip_and_check_name(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Name must be at least 2 characters long")
            if len(v) > 50:
                raise ValueError("Name cannot exceed 50 characters")
        return v

    @field_validator("email", mode="before")
    def lowercase_and_check_email(cls, v):
        if isinstance(v, str):
            if len(v) > 100:
                raise ValueError("Email cannot exceed 100 characters")
            return v.lower()
        return v

    @field_validator("password")
    def check_password_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        if len(v) > 100:
            raise ValueError("Password cannot exceed 100 characters")
        return v

class UserLogin(BaseModel):
    email: EmailStr = Field(..., max_length=100)
    password: str = Field(..., min_length=6, max_length=100, pattern=r"^[^\s;'\"]+$")

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str


class QueryRequest(BaseModel):
    query_text: str = Field(..., min_length=20, max_length=2000)

    @field_validator("query_text")
    def check_query_text(cls, v):
        if len(v) < 20:
            raise ValueError("Query text must be at least 20 characters long to provide enough context.")
        if len(v) > 2000:
            raise ValueError("Query text cannot exceed 2000 characters.")
        return v

class IPCSectionOut(BaseModel):
    section_number: str
    title: str
    description: str
    punishment: str
    fine: Optional[str] = None
    reference_link: Optional[str] = None

    class Config:
        from_attributes = True

class LegalAnalysis(BaseModel):
    legal_category: str
    summary: str
    relevant_sections: List[IPCSectionOut]
    possible_outcomes: List[str]
    precautions: List[str]
    recommended_actions: List[str]

class QueryResponse(BaseModel):
    query_id: int
    query_text: str
    analysis: LegalAnalysis
    timestamp: datetime

    class Config:
        from_attributes = True
