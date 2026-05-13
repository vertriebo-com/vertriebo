{
  "name": "processLeadOutcomeFeedback",
  "entry": "entry.ts",
  "automations": [
    {
      "type": "scheduled",
      "name": "daily_feedback_processing",
      "description": "Verarbeitet Outcome-Feedback täglich für alle Organisationen",
      "is_active": true,
      "schedule_mode": "recurring",
      "schedule_type": "simple",
      "repeat_unit": "days",
      "repeat_interval": 1,
      "start_time": "03:00"
    }
  ]
}