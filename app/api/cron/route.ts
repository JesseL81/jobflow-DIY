import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Fetch ALL punch lists and calendar tasks
    const { data: punchListData, error: punchError } = await supabase
      .from("cloud_sync")
      .select("user_id, data")
      .eq("store_key", "cleanbuild_punch_list");

    const { data: calendarData } = await supabase
      .from("cloud_sync")
      .select("user_id, data")
      .eq("store_key", "cleanbuild_calendar_tasks");

    if (punchError || !punchListData) {
      return NextResponse.json({ success: false, error: "Database fetch failed." }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    let emailsToSend: { email: string, task: any }[] = [];

    // 2. Loop through every saved punch list
    for (const userRecord of punchListData) {
      const punchList = userRecord.data || [];
      
      // Match calendar tasks for the same user (for linked dates)
      const userCalendarRecord = calendarData?.find(c => c.user_id === userRecord.user_id);
      const calendarTasks = userCalendarRecord ? (userCalendarRecord.data || []) : [];

      for (const task of punchList) {
        if (task.completed) continue;

        // Calculate the TRUE due date
        let displayDueDate = task.dueDate;
        if (task.linkedTaskId) {
          const linkedTask = calendarTasks.find((t: any) => t.id === task.linkedTaskId);
          if (linkedTask) {
            const baseDate = new Date(linkedTask.endDate + "T00:00:00");
            if (task.linkedTaskOffset) {
              baseDate.setDate(baseDate.getDate() + task.linkedTaskOffset);
            }
            displayDueDate = baseDate.toISOString().split("T")[0];
          }
        }

        // 3. If due today OR PAST DUE, collect the emails
        if (displayDueDate && displayDueDate <= today) {
          // Fallback to legacy assignedEmail string just in case
          const emails = task.assignedEmails && task.assignedEmails.length > 0 
            ? task.assignedEmails 
            : (task.assignedEmail ? [task.assignedEmail] : []);

          for (const email of emails) {
            if (email) {
              // Pass the calculated date to the task object so we can use it in the email
              const enrichedTask = { ...task, displayDueDate };
              emailsToSend.push({ email: email.toLowerCase().trim(), task: enrichedTask });
            }
          }
        }
      }
    }

    if (emailsToSend.length === 0) {
      return NextResponse.json({ success: true, message: "No active tasks due." });
    }

    // 4. Group by email so each person only gets ONE digest email
    const tasksByEmail = emailsToSend.reduce((acc: any, item: any) => {
      if (!acc[item.email]) acc[item.email] = [];
      // Prevent duplicating the exact same task
      if (!acc[item.email].some((t: any) => t.id === item.task.id)) {
        acc[item.email].push(item.task);
      }
      return acc;
    }, {});

    // 5. Send emails
    for (const [email, tasks] of Object.entries(tasksByEmail)) {
      const tasksByCategory = (tasks as any[]).reduce((acc: any, task: any) => {
        const cat = task.category || "General To-Do";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(task);
        return acc;
      }, {});

      let tasksHtml = '';
      for (const [category, catTasks] of Object.entries(tasksByCategory)) {
        tasksHtml += `
          <h3 style="color: #0f172a; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 18px;">
            ${category}
          </h3>
        `;
        for (const task of catTasks as any[]) {
          // Identify if past due to color-code the email alert
          const isPastDue = task.displayDueDate < today;
          const dueBadge = isPastDue 
            ? `<span style="background-color: #ffe4e6; color: #e11d48; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 4px; display: inline-block;">⚠️ PAST DUE</span>`
            : `<span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 4px; display: inline-block;">DUE TODAY</span>`;

          tasksHtml += `
            <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid ${isPastDue ? '#e11d48' : '#2563eb'}; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
              ${dueBadge}
              <strong style="display: block; font-size: 16px; color: #1e293b; margin-top: 4px;">${task.text}</strong>
              ${task.notes ? `<p style="color: #475569; font-size: 14px; margin: 8px 0 0 0; line-height: 1.4;"><strong>Notes:</strong> ${task.notes}</p>` : ''}
            </div>
          `;
        }
      }

      await resend.emails.send({
        from: "CleanBuild Notifications <alerts@reminder.cleanbuild.us>",
        to: email,
        subject: `CleanBuild: Action Required (${(tasks as any[]).length} active tasks)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <img src="https://diy.cleanbuild.us/logo.png" alt="CleanBuild Logo" style="height: 48px; width: auto; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;" />
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Daily Task Digest</h2>
            </div>
            <div style="padding: 32px 24px;">
              <p style="color: #334155; font-size: 16px; margin-top: 0;">Hello,</p>
              <p style="color: #334155; font-size: 16px;">Here are your assigned tasks. Please ensure these are addressed.</p>
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

    return NextResponse.json({ success: true, message: "Successfully processed emails." });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process cron job" }, { status: 500 });
  }
}