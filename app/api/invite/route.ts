import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    // 1. Get the email and permissions sent from your Settings page
    const { email, permissions } = await request.json()
    
    // 2. Grab the secure auth token from the request headers
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 })
    }

    // 3. Connect to Supabase securely
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // 4. Extract the raw token and explicitly hand it to Supabase
    const token = authHeader.replace("Bearer ", "")
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: "Could not verify your account token." }, { status: 401 })
    }
    
    const userId = authData.user.id
    
    // 5. Find the master project belonging to the primary user
    let { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", userId)
      .single()

    // Auto-create the project folder if they don't have one
    if (!project) {
      const { data: newProject, error: createError } = await supabase
        .from("projects")
        .insert({ owner_id: userId, project_name: "My Home Build" })
        .select("id")
        .single()
        
      if (createError || !newProject) {
        console.error("Project Creation Error:", createError)
        return NextResponse.json({ error: `Database blocked folder creation: ${createError?.message}` }, { status: 500 })
      }
      project = newProject
    }

    // 6. Enforce the 1-Partner Limit
    const { data: members } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", project.id)

    if (members && members.length >= 1) {
      return NextResponse.json({ error: "Limit reached. You can only share this project with one partner." }, { status: 400 })
    }

    // 7. Save the invite to the database
    const { error: insertError } = await supabase
      .from("project_members")
      .insert({
        project_id: project.id,
        invite_email: email.toLowerCase(),
        status: "Pending (Invite Sent)",
        permissions: permissions
      })

    if (insertError) {
      console.error("Invite Insert Error:", insertError)
      return NextResponse.json({ error: `Database blocked invite creation: ${insertError.message}` }, { status: 500 })
    }

    // 8. 🔥 NEW: Send the actual email using Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "CleanBuild <alerts@reminder.cleanbuild.us>", // UPDATE THIS to your verified sending address
        to: email,
        subject: "You've been invited to collaborate on CleanBuild!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a;">You've been invited!</h2>
            <p style="color: #334155; line-height: 1.6;">
              You have been invited to collaborate on a home build project in <strong>CleanBuild</strong>.
            </p>
            <p style="color: #334155; line-height: 1.6;">
              Click the button below to log in or create an account to accept the invitation and access the project data.
            </p>
            <div style="margin-top: 30px; margin-bottom: 30px;">
              <a href="https://diy.cleanbuild.us/login" 
                 style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Join the Project
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px;">
              If you weren't expecting this email, you can safely ignore it.
            </p>
          </div>
        `
      })
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error("Resend API Error:", resendError)
      // We still return success because the database insert worked, but we warn the user
      return NextResponse.json({ success: true, warning: "Invite saved, but email failed to send. Please check your Resend configuration." })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}