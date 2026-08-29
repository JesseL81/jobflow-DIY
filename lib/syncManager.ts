import { supabase } from "./supabase"
import { get, set } from "idb-keyval"

export const syncManager = {
  async pushToCloud(storeKey: string, data: any) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) {
        console.error(`🚨 Cloud Sync Aborted for ${storeKey}: No user is logged in.`)
        return 
      }

      // If we are strictly offline, flag it as dirty and abort the network request
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.warn(`✈️ Offline mode: Marking ${storeKey} as pending for next sync.`)
        await set(`dirty_${storeKey}`, true)
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

      if (updateError) throw updateError

      // 2. If no row was updated (because it doesn't exist yet), INSERT a new one
      if (!existingData || existingData.length === 0) {
        const { error: insertError } = await supabase
          .from('cloud_sync')
          .insert({
            user_id: userId,
            store_key: storeKey,
            data: data
          })
        
        if (insertError) throw insertError
      }

      // 3. Success! Clear the dirty flag so we know the cloud is fully up-to-date
      await set(`dirty_${storeKey}`, false)

    } catch (error) {
      // If the network drops mid-request, catch the error and flag it for later
      console.error(`⚠️ Cloud push failed for ${storeKey}, marking as dirty for later:`, error)
      await set(`dirty_${storeKey}`, true)
    }
  },

  async pullFromCloud(storeKey: string) {
    // Check if we have pending offline changes waiting to be uploaded
    const isDirty = await get(`dirty_${storeKey}`)

    if (isDirty) {
      console.log(`🛑 Wait! Offline changes detected for ${storeKey}. Pushing local data instead of pulling.`)
      
      const localData = await get(storeKey)
      if (localData) {
        // Push the fresh local data up to the cloud to overwrite the stale cloud data
        await this.pushToCloud(storeKey, localData)
      }
      
      // Return the local data to the UI so it doesn't get erased by the stale cloud data
      return localData
    }

    // Normal Pull Logic (Runs if the local data is clean and fully synced)
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