# Google Play Billing setup

## Product

- Create a one-time product in Play Console with product ID `premium_unlock`.
- Make it a non-consumable entitlement for premium helper tools.
- Keep the product active and available in each country where the app is sold.
- The app package must stay `com.sirmaxen.WhoStarts`, matching `app.config.js`.

## App flow

- Buy opens the Google Play purchase sheet for `premium_unlock`.
- Restore checks the Google account's owned one-time products and re-enables premium.
- Successful purchases are finished as non-consumable purchases, which acknowledges them with Google Play.
- Pending purchases do not unlock premium until Google Play reports them as purchased.
- In development Android builds, `expo.extra.enableMockBilling` can be `true` to test the premium UI without Google Play. This is guarded by `__DEV__`, so production builds still use Google Play Billing.

## Promo codes

- Create promo codes in Play Console under Monetize with Play > Promo codes.
- For this premium unlock, choose the one-time product promotion for `premium_unlock`.
- Users can redeem one-time codes in Google Play. After redeeming, opening the app or tapping Restore Purchase grants premium.
- If Google Play exposes in-app redemption inside the purchase sheet for the user, the normal Buy flow will handle it.

## Policy notes

- Do not add links or text in the Android app that sends users to another payment method for this digital unlock.
- Keep the premium name, description, screenshots, and price clear in Play Console.
- Test with a Play Console internal testing track and licensed testers before production.
- A secure backend receipt check is stronger against fraud. The current app is client-only, so it restores and acknowledges through Google Play Billing on-device.
