locals {
  source_files = fileset(var.source_path, "app/**/*.py")
  source_hash = sha256(join(",", sort([
    for f in local.source_files : filemd5("${var.source_path}/${f}")
  ])))
  build_dir = "${var.source_path}/dist"
}
data "external" "build" {
  program     = ["node", abspath("${path.module}/scripts/build.js")]
  working_dir = var.source_path
  query = {
    command = "rm -rf dist/api && mkdir -p dist/api && pip install . -t dist/api && cp -r app dist/api/"
  }
}
data "archive_file" "api" {
  depends_on  = [data.external.build]
  type        = "zip"
  source_dir  = "${local.build_dir}/api"
  output_path = "${local.build_dir}/api.zip"
}
