import os
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
DB_NAME = os.getenv("DB_NAME", "stocksai_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
chat_collection = db["chat_sessions"]


def serialize_session(doc):
    """Converts MongoDB BSON ObjectId and datetimes into JSON-friendly types."""
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if isinstance(doc.get("updated_at"), datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


def create_chat_session(first_message, action_mode=None):
    """Creates a new chat session document and generates a title from the first prompt."""
    # Clean a concise title (max 5 words or 40 chars)
    clean_title = first_message.strip()
    if action_mode:
        clean_title = f"[{action_mode}] {clean_title}"
    title = (clean_title[:37] + "...") if len(clean_title) > 40 else clean_title

    session_doc = {
        "title": title or "New Analysis",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "messages": []
    }
    result = chat_collection.insert_one(session_doc)
    return str(result.inserted_id)


def add_message_to_session(session_id, sender, text, feature=None):
    """Appends a single message (user or bot) to an existing session."""
    try:
        obj_id = ObjectId(session_id)
    except Exception:
        return False

    message_entry = {
        "sender": sender,
        "text": text,
        "feature": feature,
        "timestamp": datetime.utcnow().isoformat()
    }

    result = chat_collection.update_one(
        {"_id": obj_id},
        {
            "$push": {"messages": message_entry},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    return result.modified_count > 0


def get_all_sessions():
    """Returns metadata for all conversations sorted by latest activity for the sidebar."""
    cursor = chat_collection.find(
        {},
        {"title": 1, "created_at": 1, "updated_at": 1}
    ).sort("updated_at", -1)

    sessions = []
    for doc in cursor:
        sessions.append(serialize_session(doc))
    return sessions


def get_session_messages(session_id):
    """Retrieves the full message history for a specific conversation."""
    try:
        obj_id = ObjectId(session_id)
    except Exception:
        return None

    doc = chat_collection.find_one({"_id": obj_id})
    return serialize_session(doc)


def delete_session(session_id):
    """Deletes a chat session by ID."""
    try:
        obj_id = ObjectId(session_id)
    except Exception:
        return False

    result = chat_collection.delete_one({"_id": obj_id})
    return result.deleted_count > 0