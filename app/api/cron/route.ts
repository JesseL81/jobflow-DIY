import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize Resend using your secret key from Vercel
const resend = new Resend(process.env.RESEND_API_KEY);

// 2. Initialize Supabase using your existing environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  // Security Check: Ensure ONLY Vercel's automated system can trigger this URL
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 3. Fetch your Punch List directly from the Supabase cloud_sync table
    const { data, error } = await supabase
      .from("cloud_sync")
      .select("data")
      .eq("store_key", "jobflow_punch_list")
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "No punch list data found in cloud." }, { status: 400 });
    }

    const punchList = data.data; // This is the JSON array of your tasks

    // 4. Find tasks that are Due Today AND have an assigned email
    const today = new Date().toISOString().split("T")[0]; // Gets format YYYY-MM-DD
    
    const tasksDueToday = punchList.filter((task: any) => 
      !task.completed && 
      task.dueDate === today && 
      task.assignedEmail
    );

    // If nothing is due today, we stop here and succeed silently.
    if (tasksDueToday.length === 0) {
      return NextResponse.json({ success: true, message: "No tasks due today. No emails sent." });
    }

    // 5. Send a beautiful HTML email for every task due today
    for (const task of tasksDueToday) {
      await resend.emails.send({
        from: "CleanBuild Notifications <alerts@reminder.cleanbuild.us>", // This uses your verified domain!
        to: task.assignedEmail,
        subject: `Action Required Today: ${task.text}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
            <h2 style="color: #0f172a; margin-top: 0;">CleanBuild Project Reminder</h2>
            <p style="color: #334155; font-size: 16px;">Hello,</p>
            <p style="color: #334155; font-size: 16px;">This is an automated notification that the following task is required for the project today:</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <strong>Task:</strong> ${task.text}<br/><br/>
              <strong>Due Date:</strong> ${task.dueDate}
            </div>
            
            <p style="color: #334155; font-size: 14px;">Please ensure this is completed by the end of the day.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">Sent securely via CleanBuild Project Management</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, message: `Successfully sent ${tasksDueToday.length} reminder emails.` });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process cron job" }, { status: 500 });
  }
}