import pytest

from app.vfs import parse_zip_to_vfs


def test_parse_zip_to_vfs_nested_files_and_metadata(make_zip_base64):
    payload = make_zip_base64(
        {
            "docs/readme.txt": "hello world",
            "src/main.py": "print('ok')",
        }
    )

    vfs = parse_zip_to_vfs(payload)

    assert vfs["name"] == "/"
    assert vfs["type"] == "directory"

    docs_dir = next(child for child in vfs["children"] if child["name"] == "docs")
    readme = next(child for child in docs_dir["children"] if child["name"] == "readme.txt")
    assert readme["type"] == "file"
    assert readme["size"] == len("hello world")
    assert isinstance(readme["modified"], str)
    assert "T" in readme["modified"]


def test_parse_zip_to_vfs_raises_on_invalid_payload():
    with pytest.raises(Exception):
        parse_zip_to_vfs("not-base64-and-not-zip")

