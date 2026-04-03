locals {
  source_files = fileset(var.source_path, "{src,functions}/**/*.ts")
  source_hash = sha256(join(",", sort([
    for f in local.source_files : filemd5("${var.source_path}/${f}")
  ])))
  package_hash = filemd5("${var.source_path}/package-lock.json")
  build_dir    = "${var.source_path}/dist"
}

data "external" "build" {
  program     = ["node", abspath("${path.module}/scripts/build.js")]
  working_dir = var.source_path

  query = {
    command = "npm ci && npm run build"
  }
}

# ── Zip archives (cross-platform via archive provider) ──────
data "archive_file" "api" {
  depends_on  = [data.external.build]
  type        = "zip"
  source_dir  = "${local.build_dir}/api"
  output_path = "${local.build_dir}/api.zip"
}

data "archive_file" "delete_worker" {
  depends_on  = [data.external.build]
  type        = "zip"
  source_dir  = "${local.build_dir}/delete-worker"
  output_path = "${local.build_dir}/delete-worker.zip"
}

data "archive_file" "stream_processor" {
  depends_on  = [data.external.build]
  type        = "zip"
  source_dir  = "${local.build_dir}/stream-processor"
  output_path = "${local.build_dir}/stream-processor.zip"
}

data "archive_file" "notification" {
  depends_on  = [data.external.build]
  type        = "zip"
  source_dir  = "${local.build_dir}/notification"
  output_path = "${local.build_dir}/notification.zip"
}
