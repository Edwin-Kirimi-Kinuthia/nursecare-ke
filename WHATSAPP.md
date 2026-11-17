# WhatsApp service notifications

The site supports Meta's WhatsApp Cloud API. The WhatsApp Business phone app on
its own does not provide the API credentials needed by the website.

Configure admin recipients privately in `WHATSAPP_ADMIN_TO`. These are recipient
numbers, not sender credentials. Use an API sending number different from the
admin recipient: a business number cannot send WhatsApp messages to itself.
Multiple opted-in admin numbers can be comma-separated.

## Events

| Recipient | Trigger |
| --- | --- |
| Admin | New patient registration, including a new Google/Facebook account |
| Admin | New client booking or provider-scheduled invitation |
| Admin | Website contact enquiry or client reply in an existing thread |
| Client, with consent | Confirmed appointment, including instant confirmations |
| Client, with consent | Provider-scheduled free meeting |
| Client, with consent | Provider actually connects to the meeting, including resumed sessions |
| Client, with consent | Staff replies to a website support thread |

Existing email, SMS and in-app messages continue. WhatsApp links use the ordinary
authenticated portal: they do not contain login tokens, diagnoses, prescriptions,
clinical notes or the contents of contact enquiries. Notification links never
bypass payment or participant checks. Patient bookings still require payment;
only provider invitations/resumed consultations waive it.

## Connect the business account

1. Set up a Meta business portfolio, WhatsApp Business Account and Cloud API
   sending number. Follow [Meta's onboarding documentation](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).
   For an existing phone-app number, check Meta's supported onboarding/coexistence
   options before changing its registration. This repository does not migrate it.
2. Create a production system-user access token with `whatsapp_business_messaging`
   access to the sending account. Save credentials privately in Vercel's production
   environment, never in source control or a chat message:
   `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (numeric ID, not phone digits),
   `WHATSAPP_APP_SECRET`, and a random `WHATSAPP_VERIFY_TOKEN`.
   API version defaults to `v25.0`; it can be changed with `WHATSAPP_API_VERSION`.
3. Create the utility templates below in WhatsApp Manager and wait for Meta approval.
   Match their language to `WHATSAPP_TEMPLATE_LANGUAGE` (default `en`). Environment
   overrides in `.env.example` let you use different approved template names.
4. Configure the Meta callback URL:
   `https://app.carebora.co.ke/api/v1/notifications/whatsapp/webhook`.
   Use the verify token above and subscribe to the `messages` webhook field for
   delivery receipts and STOP/START handling. POSTs must carry the Meta app-secret
   HMAC signature; unsigned requests are rejected.
5. In the LiveKit dashboard, configure the webhook URL
   `https://app.carebora.co.ke/api/v1/consultations/livekit-webhook` with the same
   API key as the site. Signed `participant_joined` events cover native and web
   calls. The browser also verifies presence with the server after connecting.
6. Configure `WHATSAPP_ADMIN_TO` with a distinct, opted-in admin recipient and
   `WHATSAPP_ENABLED=true`, then redeploy. No historical events
   are queued while sending is disabled.
7. Set a random `CRON_SECRET` and schedule an HTTPS GET every minute to
   `/api/v1/notifications/whatsapp/process`, with
   `Authorization: Bearer <CRON_SECRET>`. Use an authenticated scheduler; if using
   Vercel Cron, choose a schedule supported by the project's plan. The repository
   does not add a paid scheduler automatically. New events send immediately;
   this worker retries transient failures and expires stale messages. An admin
   can also process eligible retries from **Admin → WhatsApp**.
8. Confirm delivery using a consenting test account and the admin delivery panel
   before enabling alerts for clients. No real WhatsApp messages are sent by the
   automated tests.

## Utility templates

Create body-only templates with numbered text parameters in this exact order.
Include a static footer `Reply STOP to stop WhatsApp notifications.` where Meta
permits it. Do not add required media headers or buttons to these templates.
The sending account is responsible for template approval and messaging charges.

| Template name | Body |
| --- | --- |
| `carebora_admin_activity` | `CareBora website update: {{1}}. Reference: {{2}}. View details securely in the admin dashboard: {{3}}. Please sign in to view the update.` |
| `carebora_appointment_confirmed` | `Your CareBora appointment is confirmed for {{1}}. {{2}} View your booking: {{3}}. Please sign in to manage your appointment.` |
| `carebora_provider_invitation` | `Your CareBora provider has invited you to a meeting at {{1}}. No payment is required for this invitation. View the meeting: {{2}}. Please sign in to view your invitation.` |
| `carebora_provider_ready` | `Your CareBora provider has joined your consultation. Join from your secure account: {{1}}. Please sign in to enter the meeting.` |
| `carebora_support_reply` | `CareBora has replied to your website enquiry. Read the reply in your secure account: {{1}}. Please sign in to view your messages.` |

The confirmation payment parameter says either to pay the appointment fee in the
portal before joining, or that the provider invitation needs no payment. Dates
are formatted in Africa/Nairobi time and labelled EAT.

## Consent and delivery behavior

- Signup has an unchecked WhatsApp consent option. Existing accounts, including
  social-signup users, can opt in at **Account settings → WhatsApp notifications**
  and select a number. Merely having an account phone number does not opt anyone in.
- STOP/UNSUBSCRIBE/CANCEL suppress the number and disable matching preferences.
  START removes suppression; the client must still opt back in through settings.
- A durable database outbox deduplicates each event and recipient. Reconnecting
  to the same call does not send repeated alerts; a provider-resumed session can
  send one fresh alert. LiveKit presence is verified on the server, never trusted
  from a browser request alone.
- The send response means **accepted**, not delivered. Signed Meta receipts update
  sent/delivered/read/failed status without allowing late receipts to regress it.
- Transient HTTP failures can retry at most three times. Timeouts/interrupted sends
  are marked **unknown** and held, because automatic resending could duplicate a
  message already accepted by Meta. Review those in the sender account.
- Provider-ready alerts expire in 15 minutes; other alerts in 24 hours. Opt-outs,
  changed preferences and deleted accounts cancel pending client sends.
- Credentials are never returned by the API. Admin status includes only missing
  setting names, masked recipients, delivery states and provider error codes.

References: [Meta send API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api),
[Meta webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview),
[LiveKit webhooks](https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/).
