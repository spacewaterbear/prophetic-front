## humain Guideline

### settup webhook

endpoint url : domaine name
Checkout

checkout.session.completed — Occurs when a Checkout Session has been successfully completed.

Customer

customer.subscription.created — Occurs whenever a customer is signed up for a new plan.
customer.subscription.deleted — Occurs whenever a customer's subscription ends.
customer.subscription.updated — Occurs whenever a subscription changes (e.g., switching plans, or changing status from trial to active).

Entitlements

entitlements.active_entitlement_summary.updated — Occurs whenever a customer's entitlements change.

Invoice

invoice.created — Occurs whenever a new invoice is created.
invoice.finalization_failed — Occurs whenever a draft invoice cannot be finalized.
invoice.finalized — Occurs whenever a draft invoice is finalized and updated to be an open invoice.
invoice.paid — Occurs whenever an invoice payment attempt succeeds or an invoice is marked as paid out-of-band.
invoice.payment_action_required — Occurs whenever an invoice payment attempt requires further user action.
invoice.payment_failed — Occurs whenever an invoice payment attempt fails.
invoice.payment_succeeded — Occurs whenever an invoice payment attempt succeeds.
invoice.upcoming — Occurs X days before a subscription is scheduled to create an auto-charged invoice.
invoice.updated — Occurs whenever an invoice changes.

Payment Intent

payment_intent.created — Occurs when a new PaymentIntent is created.
payment_intent.succeeded — Occurs when a PaymentIntent has successfully completed payment.

Subscription Schedule

subscription_schedule.aborted — Occurs whenever a subscription schedule is canceled due to delinquency.
subscription_schedule.canceled — Occurs whenever a subscription schedule is canceled.
subscription_schedule.completed — Occurs whenever a new subscription schedule is completed.
subscription_schedule.created — Occurs whenever a new subscription schedule is created.
subscription_schedule.expiring — Occurs 7 days before a subscription schedule will expire.
subscription_schedule.released — Occurs whenever a new subscription schedule is released.
subscription_schedule.updated — Occurs whenever a subscription schedule is updated.


# api key restracted ressources

  ┌───────────────────┬───────────────────────────────────┐
  │     Resource      │            Permission             │
  ├───────────────────┼───────────────────────────────────┤
  │ Checkout Sessions │ Write                             │
  ├───────────────────┼───────────────────────────────────┤
  │ Customers         │ Write                             │
  ├───────────────────┼───────────────────────────────────┤
  │ Customer Portal   │ Write                             │
  ├───────────────────┼───────────────────────────────────┤
  │ Prices            │ Read                              │
  ├───────────────────┼───────────────────────────────────┤
  │ Products          │ Read                              │
  ├───────────────────┼───────────────────────────────────┤
  │ Subscriptions     │ Write                             │
  ├───────────────────┼───────────────────────────────────┤
  │ Webhook Endpoints │ None (webhook secret is separate) │
  └───────────────────┴───────────────────────────────────┘