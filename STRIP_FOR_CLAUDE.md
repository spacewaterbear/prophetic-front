# Rules


## interaction with app
when you change code linked to stripe, make sure to keep these fonctionnality : 
- a subscription in stripe need to be propagated into the table "profiles" at the column status. Here is the enum of this column : 
  - free : no subscription
  - flash
  - discover
  - intelligence
  - oracle

here are the plan from the cheapest to the most expensive

flash<discover<intelligence<oracle>

## subscription change to performe 

- [x] if a user has already subscribe to a plan, he should be able to subscribe again
- [x] if a user upgrade plan from plan1 to plan2 (for example flash to oracle), that should be possible and with a final price of plan2-plan1, reseting the subsription start to the current date
- [x] if a user downgrade plan from plan2 to plan1 (for example oracle to flash), he will finish the current month with plan2 and will be switch to plan 1 before the next payment
