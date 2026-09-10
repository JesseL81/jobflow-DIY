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

    // 4. FIX: Extract the raw token and explicitly hand it to Supabase so it knows who you are!
    const token = authHeader.replace("Bearer ", "")
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: "Could not verify your account token." }, { status: 401 })
    }
    
    const userId = authData.user.id
    
    // 5. Find the master project belonging to the primary user
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", userId)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Master project folder not found." }, { status: 404 })
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

    if (insertError) throw insertError

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}