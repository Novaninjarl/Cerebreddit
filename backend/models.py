from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, func, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Association table for the many-to-many relationship between Post and ImageURL

# Stores post data, including text, images, and flair
from sqlalchemy import Column, String, Text, DateTime, func, ARRAY
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Post(Base):
    __tablename__ = 'posts'

    id = Column(String(255), primary_key=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    flair = Column(String(50), nullable=True)  # AI-assigned flair
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    image_urls = Column(ARRAY(String), nullable=True)  # Array of string URLs

# Stores historical moderation cases for auto-moderation
class ModerationCase(Base):
    __tablename__ = 'moderation_cases'
    id = Column(Integer, primary_key=True,autoincrement=True)
    post_id = Column(String(255), ForeignKey('posts.id'), nullable=False)  # Linked post
    action = Column(String(50), nullable=False)  # e.g., 'delete', 'warn', 'approve'
    reason = Column(Text, nullable=False)  # Reason for the moderation action
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Stores subreddit insights (e.g., trending reports, flagged users)
class SubredditInsight(Base):
    __tablename__ = 'subreddit_insights'
    id = Column(Integer, primary_key=True, autoincrement=True)
    subreddit_name = Column(String(100), nullable=False)  # Name of the subreddit
    metric = Column(String(50), nullable=False)  # e.g., 'flagged_users', 'trending_posts'
    value = Column(Float, nullable=False)  # Value of the metric (e.g., count, score)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

# AI-suggested replies for moderators when handling reports
class ModReply(Base):
    __tablename__ = 'mod_replies'
    id = Column(Integer, primary_key=True, autoincrement=True)
    moderation_case_id = Column(Integer, ForeignKey('moderation_cases.id'), nullable=False)
    reply_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    