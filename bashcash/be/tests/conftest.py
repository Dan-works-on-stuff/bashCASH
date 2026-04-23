import base64
import io
import zipfile

import pytest


@pytest.fixture
def make_zip_base64():
    def _make_zip_base64(files: dict[str, bytes | str]) -> str:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for path, content in files.items():
                data = content.encode("utf-8") if isinstance(content, str) else content
                archive.writestr(path, data)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    return _make_zip_base64

