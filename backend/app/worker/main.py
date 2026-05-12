"""
Worker main: SQSキューをポーリングして PDF 処理ジョブを実行する。
"""
import logging
import time

from app.core.config import settings

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


def run_worker() -> None:
    if not settings.sqs_queue_url:
        logger.warning("SQS_QUEUE_URL が設定されていません。Worker は起動しますがジョブを処理しません。")

    logger.info("Worker 起動: SQS polling を開始します")
    while True:
        try:
            _poll_and_process()
        except Exception as e:
            logger.exception(f"Worker ループでエラーが発生しました: {e}")
        time.sleep(5)


def _poll_and_process() -> None:
    if not settings.sqs_queue_url:
        time.sleep(30)
        return

    import boto3
    sqs = boto3.client("sqs", region_name=settings.aws_region)

    response = sqs.receive_message(
        QueueUrl=settings.sqs_queue_url,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=20,
        VisibilityTimeout=300,
    )

    messages = response.get("Messages", [])
    for msg in messages:
        receipt_handle = msg["ReceiptHandle"]
        try:
            _handle_message(msg["Body"])
            sqs.delete_message(QueueUrl=settings.sqs_queue_url, ReceiptHandle=receipt_handle)
        except Exception as e:
            logger.exception(f"ジョブ処理に失敗しました: {e}")


def _handle_message(body: str) -> None:
    import json
    from app.worker.jobs.process_document import process_document

    data = json.loads(body)
    job_type = data.get("job_type")

    if job_type == "process_document":
        process_document(document_id=data["document_id"])
    else:
        logger.warning(f"未知の job_type: {job_type}")


if __name__ == "__main__":
    run_worker()
