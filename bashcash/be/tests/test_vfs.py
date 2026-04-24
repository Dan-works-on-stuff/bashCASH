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
    assert readme["content"] == "hello world"


def test_parse_zip_to_vfs_only_embeds_supported_text_content(make_zip_base64):
    payload = make_zip_base64(
        {
            "scripts/worker.sh": "echo hi",
            "scripts/main.py": "print('no-inline-content')",
        }
    )

    vfs = parse_zip_to_vfs(payload)

    scripts_dir = next(child for child in vfs["children"] if child["name"] == "scripts")
    worker = next(child for child in scripts_dir["children"] if child["name"] == "worker.sh")
    main_py = next(child for child in scripts_dir["children"] if child["name"] == "main.py")

    assert worker["content"] == "echo hi"
    assert "content" not in main_py


def test_parse_zip_to_vfs_raises_on_invalid_payload():
    with pytest.raises(Exception):
        parse_zip_to_vfs("not-base64-and-not-zip")

