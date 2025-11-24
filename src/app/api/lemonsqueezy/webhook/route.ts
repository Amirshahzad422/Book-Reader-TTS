import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

// Verify webhook signature
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    // Verify webhook signature
    if (!signature || !process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
      console.error("Missing signature or webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isValid = verifySignature(
      rawBody,
      signature,
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventName = event.meta.event_name;

    console.log(`📨 Webhook received: ${eventName}`);

    if (!supabaseAdmin) {
      console.error("Supabase admin client not initialized");
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    // Handle different webhook events
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_payment_success":
        await handleSubscriptionActive(event);
        break;

      case "subscription_cancelled":
      case "subscription_expired":
      //case "subscription_paused":
      case "subscription_payment_failed":
        await handleSubscriptionInactive(event);
        break;

    //  case "subscription_payment_failed":
  //      await handlePaymentFailed(event);
//        break;

      default:
        console.log(`Unhandled event: ${eventName}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionActive(event: any) {
  const { data, meta } = event;
  const email = data.attributes.user_email;
  const subscriptionId = data.id;
  const status = data.attributes.status;
  const endsAt = data.attributes.ends_at;

  console.log(`✅ Activating subscription for ${email}`);

  // Find user by email
  const { data: user, error: findError } = await supabaseAdmin!
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (findError || !user) {
    console.error("User not found:", email);
    return;
  }

  // Calculate expiry date based on LemonSqueezy data or default to 30 days
  let expiryDate = new Date();
  if (endsAt) {
    expiryDate = new Date(endsAt);
  } else {
    expiryDate.setDate(expiryDate.getDate() + 30);
  }

  // Update user subscription
  const { error: updateError } = await supabaseAdmin!
    .from("users")
    .update({
      subscription_plan: "paid",
      subscription_id: subscriptionId,
      conversions: 50,
      expiry_date: expiryDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update user:", updateError);
    return;
  }

  console.log(
    `✅ Subscription activated for ${email} until ${expiryDate.toISOString()}`
  );
}

async function handleSubscriptionInactive(event: any) {
  const { data } = event;
  const email = data.attributes.user_email;
  const subscriptionId = data.id;

  console.log(`❌ Deactivating subscription for ${email}`);

  // Find user by subscription ID
  const { data: user, error: findError } = await supabaseAdmin!
    .from("users")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .single();

  if (findError || !user) {
    console.error("User not found with subscription:", subscriptionId);
    return;
  }

  // Downgrade to free plan
  const { error: updateError } = await supabaseAdmin!
    .from("users")
    .update({
      subscription_plan: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to downgrade user:", updateError);
    return;
  }

  console.log(`✅ Subscription deactivated for ${email}`);
}

async function handlePaymentFailed(event: any) {
  const { data } = event;
  const email = data.attributes.user_email;

  console.log(`⚠️ Payment failed for ${email}`);

  // You can add logic here to notify the user via email
  // or update their account status
}
