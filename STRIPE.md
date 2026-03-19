## humain Guideline
  - Your account (already selected — correct)                                                                                        
  - Subscriptions (check this box — your webhook handles customer.subscription.updated and customer.subscription.deleted)            
                                                                                                                                     
  You also need checkout.session.completed which isn't in the Subscriptions group. Click "All events" tab and search for it, or      
  expand Subscriptions to see if it's included.                                                                                      
                                                                                                                                     
  The 5 events your code handles:
  1. checkout.session.completed
  2. customer.subscription.created
  3. customer.subscription.updated
  4. customer.subscription.deleted
  5. invoice.payment_succeeded
                                  


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
  │ Subscriptions     │ Write                              │
  ├───────────────────┼───────────────────────────────────┤
  │ Webhook Endpoints │ None (webhook secret is separate) │
  └───────────────────┴───────────────────────────────────┘