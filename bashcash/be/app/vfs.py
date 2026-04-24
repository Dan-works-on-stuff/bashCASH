import base64
import io
import zipfile
import datetime
from typing import Dict, Any


def is_editable_text_file(filename: str) -> bool:
    normalized = filename.lower()
    return normalized.endswith(".txt") or normalized.endswith(".sh")


def parse_zip_to_vfs(base64_zip: str) -> Dict[str, Any]:
    zip_bytes = base64.b64decode(base64_zip)
    vfs = {
        "name": "/",
        "type": "directory",
        "children": []
    }
    def get_or_create_dir(path_parts: list[str], current_node: dict) -> dict:
        if not path_parts:
            return current_node
        part = path_parts[0]
        for child in current_node.get("children", []):
            if child["name"] == part and child["type"] == "directory":
                return get_or_create_dir(path_parts[1:], child)
        new_dir = {"name": part, "type": "directory", "children": []}
        current_node.setdefault("children", []).append(new_dir)
        return get_or_create_dir(path_parts[1:], new_dir)

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for info in zf.infolist():
            path = info.filename.strip('/')
            if not path:
                continue

            parts = path.split('/')

            file_size = info.file_size
            mod_time = datetime.datetime(*info.date_time).isoformat()

            if info.is_dir():
                get_or_create_dir(parts, vfs)
            else:
                parent_dir = get_or_create_dir(parts[:-1], vfs)
                file_entry: Dict[str, Any] = {
                    "name": parts[-1],
                    "type": "file",
                    "size": file_size,
                    "modified": mod_time
                }

                if is_editable_text_file(parts[-1]):
                    raw_content = zf.read(info.filename)
                    try:
                        file_entry["content"] = raw_content.decode("utf-8")
                    except UnicodeDecodeError:
                        # Keep non-UTF-8 text-like files visible in the tree without inline content.
                        pass

                parent_dir.setdefault("children", []).append(file_entry)
    return vfs
