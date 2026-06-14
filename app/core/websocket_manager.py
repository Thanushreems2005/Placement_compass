import json
from typing import Dict, List, Optional
from fastapi import WebSocket

class GlobalWebSocketManager:
    def __init__(self):
        # Map user_id to a list of their active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"[WebSocket] User {user_id} connected. Total active users: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"[WebSocket] User {user_id} disconnected.")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a realtime message to a specific user"""
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)
            
            for dead in dead_connections:
                self.disconnect(dead, user_id)

    async def broadcast(self, message: dict):
        """Send a realtime message to all connected clients (e.g. system alerts)"""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)

ws_manager = GlobalWebSocketManager()
