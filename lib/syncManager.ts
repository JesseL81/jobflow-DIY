import { supabase } from "./supabase"
import { get, set } from "idb-keyval"

export const syncManager = {
  // 1. Push local data up to the cloud
  async pushToCloud(storeKey: string, data: any) {
    // Check if the user is logged in
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return // If they are offline/logged out, just keep it local

    // Push the data to the cloud_sync table securely
    const { error } = await supabase
      .from('cloud_sync')
      .upsert({
        user_id: userData.user.id,
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
    if (!userData.user) return null

    const { data, error } = await supabase
      .from('cloud_sync')
      .select('data')
      .eq('user_id', userData.user.id)
      .eq('store_key', storeKey)
      .single()

    if (error || !data) return null

    // Immediately save the downloaded cloud data into the offline database so it's snappy
    await set(storeKey, data.data)
    return data.data
  }
}