import asyncio
import time
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

async def cleanup_loop(tmp_dir: str, max_age_seconds: int = 900):
    """
    Background task to clean up old files in the temporary directory.
    Deletes files older than max_age_seconds (default 15 minutes).
    Runs every 5 minutes.
    """
    while True:
        try:
            path = Path(tmp_dir)
            if path.exists():
                now = time.time()
                count = 0
                for f in path.iterdir():
                    if f.is_file():
                        try:
                            if now - f.stat().st_mtime > max_age_seconds:
                                f.unlink()
                                count += 1
                        except Exception as e:
                            logger.warning(f"Failed to delete {f}: {e}")
                if count > 0:
                    logger.info(f"Cleaned up {count} temporary files")
        except Exception as e:
            logger.error(f"Error in cleanup loop: {e}")
        
        await asyncio.sleep(300)  # Sleep for 5 minutes
