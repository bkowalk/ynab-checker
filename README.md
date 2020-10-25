# ynab-checker

Sends an email for one of your category groups in YNAB, outlining how much is available that day if you want to stay on pace for your goal.

# Config Example
```
{
  "authToken": "token_from_ynab_13784932789784979283774",
  "budgetID": "guid_found_by_curling_ynab_budgets_endpoint",
  "categoryGroupName": "Main",
  "fromEmail": "you@email.com",
  "fromEmailPass": "email_above_password",
  "toEmail": "recipient@email.com, recipient2@email.com"
}
```