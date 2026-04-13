#!/usr/bin/env python3
"""
Python microservice for hearing-date and disposal forecasting.

Relevance:
This file satisfies the requirement that the prediction logic must use Python.
The Spring Boot backend sends case data here as JSON, and this service returns
forecast values that are shown in the React "AI Insight" card.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


@dataclass
class Hearing:
    hearing_date: date
    next_hearing_date: date | None
    judge_name: str | None
    created_at: datetime | None


def confidence_label(score: int) -> str:
    if score >= 90:
        return "Very High"
    if score >= 75:
        return "High"
    if score >= 60:
        return "Medium"
    return "Early Estimate"


def default_cadence(status: str) -> int:
    return {
        "FILED": 45,
        "SCRUTINY": 30,
        "HEARING": 28,
        "ARGUMENT": 21,
        "JUDGMENT": 14,
        "CLOSED": 0,
    }.get(status, 30)


def median(values: list[int]) -> int:
    ordered = sorted(values)
    return ordered[len(ordered) // 2]


def extract_intervals(hearings: list[Hearing]) -> list[int]:
    ordered = sorted(hearings, key=lambda hearing: (hearing.hearing_date, hearing.created_at or datetime.min))
    intervals: list[int] = []
    for current, nxt in zip(ordered, ordered[1:]):
        delta = (nxt.hearing_date - current.hearing_date).days
        if delta > 0:
            intervals.append(delta)
    return intervals


def estimate_disposal_days(status: str, hearing_count: int, cadence_days: int, days_until_next_hearing: int, has_judge: bool) -> int:
    base_remaining = {
        "FILED": 300,
        "SCRUTINY": 240,
        "HEARING": 180,
        "ARGUMENT": 90,
        "JUDGMENT": 30,
        "CLOSED": 0,
    }.get(status, 180)

    adjustment = 0 if has_judge else 45
    adjustment += 30 if hearing_count == 0 else min(hearing_count * 8, 48)
    adjustment += min(cadence_days, 60)

    if status in {"FILED", "SCRUTINY"}:
        stage_buffer = days_until_next_hearing
    elif status == "HEARING":
        stage_buffer = days_until_next_hearing + max(cadence_days, 21)
    elif status == "ARGUMENT":
        stage_buffer = max(days_until_next_hearing, 21)
    elif status == "JUDGMENT":
        stage_buffer = max(days_until_next_hearing // 2, 7)
    else:
        stage_buffer = 0

    return max(base_remaining, stage_buffer + adjustment)


def build_prediction(payload: dict[str, Any]) -> dict[str, Any]:
    today = date.today()
    status = payload.get("status") or "SCRUTINY"
    judge_username = payload.get("judgeUsername")
    raw_hearings = payload.get("hearings") or []
    hearings = [
        Hearing(
            hearing_date=parse_date(item.get("hearingDate")),
            next_hearing_date=parse_date(item.get("nextHearingDate")),
            judge_name=item.get("judgeName"),
            created_at=parse_datetime(item.get("createdAt")),
        )
        for item in raw_hearings
        if item.get("hearingDate")
    ]

    if status == "CLOSED":
        return {
            "predictedNextHearingDate": None,
            "predictedNextHearingInDays": None,
            "estimatedDisposalDate": today.isoformat(),
            "estimatedDisposalInDays": 0,
            "confidenceScore": 100,
            "confidenceLabel": "Closed",
            "summary": "Case already closed",
            "reasoning": "This case has already reached the terminal workflow state.",
        }

    latest_hearing = max(
        hearings,
        key=lambda hearing: (hearing.hearing_date, hearing.created_at or datetime.min),
        default=None,
    )
    explicit_next = latest_hearing.next_hearing_date if latest_hearing else None
    if explicit_next and explicit_next < today:
        explicit_next = None

    intervals = extract_intervals(hearings)
    if explicit_next:
        cadence_days = max((explicit_next - today).days, 1)
        confidence = 96
        reasoning = "Prediction uses the explicitly recorded next hearing date from the latest hearing entry."
        predicted_next = explicit_next
    elif intervals:
        cadence_days = max(7, min(median(intervals), 90))
        confidence = 84
        reasoning = "Prediction uses the hearing cadence already observed on this case."
        predicted_next = today + timedelta(days=cadence_days)
    else:
        cadence_days = default_cadence(status)
        confidence = 54 if judge_username else 46
        reasoning = "Prediction uses the current case stage and judge assignment because there is not enough hearing history yet."
        predicted_next = today + timedelta(days=cadence_days)

    days_until_next = max((predicted_next - today).days, 0)
    disposal_days = estimate_disposal_days(status, len(hearings), cadence_days, days_until_next, bool(judge_username))
    disposal_date = today + timedelta(days=disposal_days)

    return {
        "predictedNextHearingDate": predicted_next.isoformat(),
        "predictedNextHearingInDays": days_until_next,
        "estimatedDisposalDate": disposal_date.isoformat(),
        "estimatedDisposalInDays": disposal_days,
        "confidenceScore": confidence,
        "confidenceLabel": confidence_label(confidence),
        "summary": f"Next hearing is estimated in {days_until_next} day{'s' if days_until_next != 1 else ''}, with disposal expected in about {disposal_days} day{'s' if disposal_days != 1 else ''}.",
        "reasoning": reasoning,
    }


class InsightHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/predict":
            self.send_error(404, "Not Found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
            response = build_prediction(payload)
        except Exception as exc:  # noqa: BLE001
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
            return

        body = json.dumps(response).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        # Keeps local terminal output focused on meaningful errors while the service runs.
        return


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 5001), InsightHandler)
    print("Python insight service listening on http://127.0.0.1:5001/predict")
    server.serve_forever()


if __name__ == "__main__":
    main()
