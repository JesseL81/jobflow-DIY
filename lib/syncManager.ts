import { supabase } from "./supabase"
import { get, set } from "idb-keyval"

// Paste your actual User ID right here!
const DEV_USER_ID = "PASTE-YOUR-LONG-USER-ID-HERE"

export const syncManager = {
  async pushToCloud(storeKey: string, data: any) {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || DEV_USER_ID

    if (!userId) {
      console.warn("⚠️ Cannot sync: No user ID available.")
      return 
    }

    // 1. Try to UPDATE the existing cloud row first
    const { data: existingData, error: updateError } = await supabase
      .from('cloud_sync')
      .update({
        data: data,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('store_key', storeKey)
      .select()

    // 2. If no row was updated (because it doesn't exist yet), INSERT a new one
    if (!existingData || existingData.length === 0) {
      await supabase
        .from('cloud_sync')
        .insert({
          user_id: userId,
          store_key: storeKey,
          data: data
        })
    }
  },

  async pullFromCloud(storeKey: string) {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || DEV_USER_ID

    if (!userId) return null

    // Use .maybeSingle() instead of .single() to safely handle empty databases
    const { data, error } = await supabase
      .from('cloud_sync')
      .select('data')
      .eq('user_id', userId)
      .eq('store_key', storeKey)
      .maybeSingle() 

    if (error || !data) return null

    // Immediately save the downloaded cloud data into the offline database
    await set(storeKey, data.data)
    return data.data
  }
}