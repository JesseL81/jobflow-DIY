import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("cloud_sync")
      .select("data")
      .eq("store_key", "cleanbuild_punch_list")
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "No data found." }, { status: 400 });
    }

    const punchList = data.data; 
    const today = new Date().toISOString().split("T")[0]; 
    
    // 1. Find all tasks due today that have an assigned email
    const tasksDueToday = punchList.filter((task: any) => 
      !task.completed && 
      task.dueDate === today && 
      task.assignedEmail
    );

    if (tasksDueToday.length === 0) {
      return NextResponse.json({ success: true, message: "No tasks due today." });
    }

    // 2. Group tasks by the assigned email address (so each person only gets ONE email)
    const tasksByEmail = tasksDueToday.reduce((acc: any, task: any) => {
      const email = task.assignedEmail.toLowerCase().trim();
      if (!acc[email]) acc[email] = [];
      acc[email].push(task);
      return acc;
    }, {});

    // 3. Send one digest email per person
    for (const [email, tasks] of Object.entries(tasksByEmail)) {
      
      // Group this specific person's tasks by Category
      const tasksByCategory = (tasks as any[]).reduce((acc: any, task: any) => {
        const cat = task.category || "General To-Do";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(task);
        return acc;
      }, {});

      // Build the HTML sections for each category
      let tasksHtml = '';
      for (const [category, catTasks] of Object.entries(tasksByCategory)) {
        tasksHtml += `
          <h3 style="color: #0f172a; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 18px;">
            ${category}
          </h3>
        `;
        
        for (const task of catTasks as any[]) {
          tasksHtml += `
            <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #2563eb; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
              <strong style="display: block; font-size: 16px; color: #1e293b;">${task.text}</strong>
              ${task.notes ? `<p style="color: #475569; font-size: 14px; margin: 8px 0 0 0; line-height: 1.4;"><strong>Notes:</strong> ${task.notes}</p>` : ''}
            </div>
          `;
        }
      }

      // 4. Send the consolidated email
      await resend.emails.send({
        from: "CleanBuild Notifications <alerts@reminder.cleanbuild.us>",
        to: email,
        subject: `CleanBuild: Action Required Today (${(tasks as any[]).length} tasks)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- HEADER WITH LOGO -->
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <!-- IMPORTANT: Replace the URL below with your actual hosted logo -->
              <img src="https://diy.cleanbuild.us/logo.png" alt="CleanBuild Logo" style="height: 48px; width: auto; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;" />
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Daily Task Digest</h2>
            </div>
            
            <!-- BODY -->
            <div style="padding: 32px 24px;">
              <p style="color: #334155; font-size: 16px; margin-top: 0;">Hello,</p>
              <p style="color: #334155; font-size: 16px;">Here are your assigned tasks required for the project today. Please ensure these are completed by the end of the day.</p>
              
              ${tasksHtml}
              
              <p style="color: #94a3b8; font-size: 12px; margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                Sent securely via CleanBuild Project Management<br/>
                <a href="https://diy.cleanbuild.us" style="color: #2563eb; text-decoration: none;">diy.cleanbuild.us</a>
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, message: `Successfully processed emails.` });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process cron job" }, { status: 500 });
  }
}