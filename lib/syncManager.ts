import { supabase } from "./supabase"
import { get, set } from "idb-keyval"

export const ALL_STORE_KEYS = [
  "cleanbuild_expenses",
  "cleanbuild_total_budget",
  "cleanbuild_punch_list",
  "cleanbuild_calendar_tasks",
  "cleanbuild_custom_nonworkdays",
  "cleanbuild_saturdays_off",
  "cleanbuild_sundays_off",
  "cleanbuild_explicit_working_days",
  "cleanbuild_vision_board",
  "cleanbuild_vision_board_categories",
  "cleanbuild_selections_items",
  "cleanbuild_selections_budgets",
  "cleanbuild_contacts",
] as const

export const syncManager = {
  async pushToCloud(storeKey: string, data: any) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) {
        console.warn(`Cloud push aborted: No user logged in for ${storeKey}`)
        return
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        console.warn(`✈️ Offline: Queuing ${storeKey} for cloud sync.`)
        await set(`dirty_${storeKey}`, true)
        return
      }

      const { data: existingData, error: updateError } = await supabase
        .from("cloud_sync")
        .update({
          data: data,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("store_key", storeKey)
        .select()

      if (updateError) throw updateError

      if (!existingData || existingData.length === 0) {
        const { error: insertError } = await supabase
          .from("cloud_sync")
          .insert({
            user_id: userId,
            store_key: storeKey,
            data: data,
          })

        if (insertError) throw insertError
      }

      await set(`dirty_${storeKey}`, false)
    } catch (error) {
      console.error(`Cloud push failed for ${storeKey}, marking dirty:`, error)
      await set(`dirty_${storeKey}`, true)
    }
  },

  async pullFromCloud(storeKey: string) {
    const isDirty = await get(`dirty_${storeKey}`)

    if (isDirty) {
      const localData = await get(storeKey)
      if (localData !== undefined) {
        await this.pushToCloud(storeKey, localData)
      }
      return localData
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return null

    const { data, error } = await supabase
      .from("cloud_sync")
      .select("data")
      .eq("user_id", userId)
      .eq("store_key", storeKey)
      .maybeSingle()

    if (error || !data) return null

    await set(storeKey, data.data)
    return data.data
  },

  // Flushes all queued offline changes across the entire app
  async flushAllDirty() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return

    for (const key of ALL_STORE_KEYS) {
      const isDirty = await get(`dirty_${key}`)
      if (isDirty) {
        const localData = await get(key)
        if (localData !== undefined) {
          console.log(`📡 Auto-syncing offline changes for ${key}...`)
          await this.pushToCloud(key, localData)
        }
      }
    }
  },
}

// Global Reconnection Listener: Runs automatically when internet restores
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 Internet restored! Flushing queued offline data...")
    syncManager.flushAllDirty()
  })
}