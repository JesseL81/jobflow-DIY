import { supabase } from "./supabase"
import { get, set } from "idb-keyval"

// Paste the long User ID you copied from Supabase right here!
const DEV_USER_ID = "336fe036-0a59-4dcf-af3b-25a8a7bdaf2f"

export const syncManager = {
  // 1. Push local data up to the cloud
  async pushToCloud(storeKey: string, data: any) {
    const { data: userData } = await supabase.auth.getUser()
    
    // Use the logged-in user, OR fallback to your dev ID for testing
    const userId = userData?.user?.id || DEV_USER_ID

    if (!userId) {
      console.warn("⚠️ Cannot sync: No user ID available.")
      return 
    }

    // Push the data to the cloud_sync table securely
    const { error } = await supabase
      .from('cloud_sync')
      .upsert({
        user_id: userId,
        store_key: storeKey,
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, store_key' })

    if (error) {
      console.error(`Cloud Sync Failed for ${storeKey}:`, error.message)
    } else {
      console.log(`✅ Successfully synced ${storeKey} to cloud!`)
    }
  },

  // 2. Pull the latest cloud data down to the device
  async pullFromCloud(storeKey: string) {
    const { data: userData } = await supabase.auth.getUser()
    
    const userId = userData?.user?.id || DEV_USER_ID

    if (!userId) return null

    const { data, error } = await supabase
      .from('cloud_sync')
      .select('data')
      .eq('user_id', userId)
      .eq('store_key', storeKey)
      .single()

    if (error || !data) return null

    // Immediately save the downloaded cloud data into the offline database
    await set(storeKey, data.data)
    return data.data
  }
}