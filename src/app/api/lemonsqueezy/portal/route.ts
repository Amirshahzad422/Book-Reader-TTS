import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    // Get user's subscription ID
    const { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("subscription_id")
      .eq("email", session.user.email)
      .single();

    if (findError || !user || !user.subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Call LemonSqueezy API to get customer portal URL
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${user.subscription_id}`,
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch subscription:", await response.text());
      return NextResponse.json(
        { error: "Failed to fetch subscription details" },
        { status: 500 }
      );
    }

    const subscriptionData = await response.json();
    const customerPortalUrl =
      subscriptionData.data.attributes.urls.customer_portal;

    return NextResponse.json({ url: customerPortalUrl }, { status: 200 });
  } catch (error) {
    console.error("Customer portal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
