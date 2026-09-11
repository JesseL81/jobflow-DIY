import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    
    // Connect to Supabase using standard key to verify the current user
    const supabaseUserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: authData, error: authError } = await supabaseUserClient.auth.getUser(token)
    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: "Could not verify your account token." }, { status: 401 })
    }
    
    const userId = authData.user.id
    const userEmail = authData.user.email

    // We MUST use the secure service role key to delete auth users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server misconfiguration: Missing Service Role Key in .env.local" }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // 1. Delete their master project (If they own one)
    await supabaseAdmin.from("projects").delete().eq("owner_id", userId)
    
    // 2. Delete any guest invites tied to their email (If they are a guest)
    if (userEmail) {
      await supabaseAdmin.from("project_members").delete().eq("invite_email", userEmail)
    }

    // 3. Delete cloud sync data
    await supabaseAdmin.from("cloud_sync").delete().eq("user_id", userId)

    // 4. Delete the user from the Supabase Auth system entirely
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteUserError) {
      return NextResponse.json({ error: `Database blocked user deletion: ${deleteUserError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}