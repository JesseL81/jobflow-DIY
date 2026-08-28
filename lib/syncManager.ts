import { supabase } from "./supabase"
import { get, set } from "idb-keyval"

export const syncManager = {
  async pushToCloud(storeKey: string, data: any) {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      console.error(`🚨 Cloud Sync Aborted for ${storeKey}: No user is logged in.`)
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
    const userId = userData?.user?.id

    if (!userId) {
      console.warn(`⚠️ Cannot pull ${storeKey}: No user logged in.`)
      return null
    }

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