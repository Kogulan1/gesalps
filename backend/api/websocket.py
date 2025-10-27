import asyncio
import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active connections by run_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store run statuses
        self.run_statuses: Dict[str, Dict] = {}

    async def connect(self, websocket: WebSocket, run_id: str):
        await websocket.accept()
        if run_id not in self.active_connections:
            self.active_connections[run_id] = set()
        self.active_connections[run_id].add(websocket)
        logger.info(f"WebSocket connected for run {run_id}")

    def disconnect(self, websocket: WebSocket, run_id: str):
        if run_id in self.active_connections:
            self.active_connections[run_id].discard(websocket)
            if not self.active_connections[run_id]:
                del self.active_connections[run_id]
        logger.info(f"WebSocket disconnected for run {run_id}")

    async def send_run_update(self, run_id: str, status: Dict):
        """Send run status update to all connected clients for this run"""
        self.run_statuses[run_id] = status
        
        if run_id in self.active_connections:
            message = {
                "type": "run_update",
                "runId": run_id,
                "status": status
            }
            
            # Send to all connected clients for this run
            disconnected = set()
            for websocket in self.active_connections[run_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to WebSocket: {e}")
                    disconnected.add(websocket)
            
            # Remove disconnected clients
            for websocket in disconnected:
                self.active_connections[run_id].discard(websocket)

    async def broadcast_run_update(self, status: Dict):
        """Broadcast run update to all connected clients"""
        run_id = status.get("id")
        if run_id:
            await self.send_run_update(run_id, status)

# Global connection manager
manager = ConnectionManager()

# WebSocket router
router = APIRouter()

@router.websocket("/ws/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    await manager.connect(websocket, run_id)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message.get("type") == "subscribe":
                # Client wants to subscribe to run updates
                await websocket.send_text(json.dumps({
                    "type": "subscribed",
                    "runId": run_id
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, run_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, run_id)

# Utility functions for updating run status
async def update_run_status(run_id: str, status: Dict):
    """Update run status and notify connected clients"""
    await manager.send_run_update(run_id, status)

async def broadcast_run_status(status: Dict):
    """Broadcast run status to all connected clients"""
    await manager.broadcast_run_update(status)

# Health check endpoint
@router.get("/ws/health")
async def websocket_health():
    return {
        "active_connections": sum(len(conns) for conns in manager.active_connections.values()),
        "tracked_runs": len(manager.run_statuses)
    }
