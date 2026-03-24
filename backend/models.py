from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    queries = relationship("UserQuery", back_populates="user")


class UserQuery(Base):
    __tablename__ = "user_queries"

    query_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query_text = Column(Text, nullable=False)
    analysis_result = Column(Text)
    report_path = Column(String(500))
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="queries")
    # OTPs for password reset are stored in Redis (TTL 600s), not in the DB.
