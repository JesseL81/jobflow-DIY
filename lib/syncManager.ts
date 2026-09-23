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
  "cleanbuild_shared_rooms",
  "cleanbuild_documents_folders",
  "cleanbuild_documents_items",
  "cleanbuild_projects_list" 
] as const

const GLOBAL_KEYS = [
  "cleanbuild_projects_list",
  "cleanbuild_contacts"
]

const getWorkspaceContext = async () => {
  let wid = typeof window !== 'undefined' ? localStorage.getItem("cleanbuild_active_workspace") : null
  if (!wid) {
    // 🔥 Read local storage instantly instead of network check
    const { data } = await supabase.auth.getSession()
    wid = data?.session?.user?.id || "default"
  }
  return wid
}

// Strict Timeout Engine: accepts Supabase Thenables (PromiseLike) and wraps with Promise.resolve
const withTimeout = async <T = any>(promise: PromiseLike<T> | Promise<T> | any, ms: number = 3000): Promise<T> => {
  let timeoutId: any
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Network timeout")), ms)
  })
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

export const syncManager = {
  async pushToCloud(storeKey: string, data: any) {
    try {
      const wid = await getWorkspaceContext()
      const isGlobal = GLOBAL_KEYS.includes(storeKey)
      const localDirtyKey = isGlobal ? `dirty_${storeKey}` : `dirty_${storeKey}_${wid}`

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await set(localDirtyKey, true)
        return
      }

      const { data: authData } = await supabase.auth.getSession()
      if (!authData?.session?.user?.id) {
         await set(localDirtyKey, true)
         return
      }

      const targetWorkspaceId = isGlobal 
        ? authData.session.user.id 
        : (typeof window !== 'undefined' ? (localStorage.getItem("cleanbuild_active_workspace") || authData.session.user.id) : authData.session.user.id)

      const { data: existingData, error: updateError } = await withTimeout(
        supabase
          .from("cloud_sync")
          .update({
            data: data,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", targetWorkspaceId)
          .eq("store_key", storeKey)
          .select(),
        4000 // 4 seconds max to save
      )

      if (updateError) throw updateError

      if (!existingData || existingData.length === 0) {
        const { error: insertError } = await withTimeout(
          supabase
            .from("cloud_sync")
            .insert({
              user_id: targetWorkspaceId,
              store_key: storeKey,
              data: data,
            }),
          4000
        )

        if (insertError) throw insertError
      }

      await set(localDirtyKey, false)
    } catch (error) {
      console.warn(`Cloud push failed or timed out for ${storeKey}. Saving locally instead.`)
      const wid = await getWorkspaceContext()
      const isGlobal = GLOBAL_KEYS.includes(storeKey)
      await set(isGlobal ? `dirty_${storeKey}` : `dirty_${storeKey}_${wid}`, true)
    }
  },

  async pullFromCloud(storeKey: string) {
    const wid = await getWorkspaceContext()
    const isGlobal = GLOBAL_KEYS.includes(storeKey)
    
    const localDirtyKey = isGlobal ? `dirty_${storeKey}` : `dirty_${storeKey}_${wid}`
    const localDataKey = isGlobal ? storeKey : `${storeKey}_${wid}`

    const legacyDirty = await get(`dirty_${storeKey}`)
    
    if (legacyDirty && !isGlobal && wid && !wid.startsWith("proj_")) {
       await set(localDirtyKey, true)
       await set(`dirty_${storeKey}`, false)
    }

    const isDirty = await get(localDirtyKey)
    if (isDirty) {
      const localData = await get(localDataKey)
      if (localData !== undefined) {
        this.pushToCloud(storeKey, localData)
      }
      return localData
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) return null

    const { data: authData } = await supabase.auth.getSession()
    if (!authData?.session?.user?.id) return null

    const targetWorkspaceId = isGlobal 
      ? authData.session.user.id 
      : (typeof window !== 'undefined' ? (localStorage.getItem("cleanbuild_active_workspace") || authData.session.user.id) : authData.session.user.id)

    try {
      // 🔥 Strict 3-second limit. If the network is stalling, abort instantly so UI doesn't hang.
      const { data, error } = await withTimeout(
        supabase
          .from("cloud_sync")
          .select("data")
          .eq("user_id", targetWorkspaceId)
          .eq("store_key", storeKey)
          .maybeSingle(),
        3000
      )

      if (error || !data) return null

      await set(localDataKey, data.data)
      return data.data
    } catch (err) {
      console.warn(`Pull from cloud timed out for ${storeKey}. Yielding to local data cache.`)
      return null
    }
  },

  async flushAllDirty() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return

    const wid = await getWorkspaceContext()

    for (const key of ALL_STORE_KEYS) {
      const isGlobal = GLOBAL_KEYS.includes(key)
      const localDirtyKey = isGlobal ? `dirty_${key}` : `dirty_${key}_${wid}`
      const localDataKey = isGlobal ? key : `${key}_${wid}`

      const isDirty = await get(localDirtyKey)
      if (isDirty) {
        const localData = await get(localDataKey)
        if (localData !== undefined) {
          await this.pushToCloud(key, localData)
        }
      }
    }
  },
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncManager.flushAllDirty()
  })
}