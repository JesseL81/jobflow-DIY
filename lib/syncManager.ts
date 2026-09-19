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

const getWorkspaceContext = async () => {
  let wid = typeof window !== 'undefined' ? localStorage.getItem("cleanbuild_active_workspace") : null
  if (!wid) {
    const { data } = await supabase.auth.getUser()
    wid = data?.user?.id || "default"
  }
  return wid
}

export const syncManager = {
  async pushToCloud(storeKey: string, data: any) {
    try {
      const wid = await getWorkspaceContext()
      const isGlobal = storeKey === "cleanbuild_projects_list"
      const localDirtyKey = isGlobal ? `dirty_${storeKey}` : `dirty_${storeKey}_${wid}`

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await set(localDirtyKey, true)
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
         await set(localDirtyKey, true)
         return
      }

      const targetWorkspaceId = isGlobal 
        ? userData.user.id 
        : (typeof window !== 'undefined' ? (localStorage.getItem("cleanbuild_active_workspace") || userData.user.id) : userData.user.id)

      const { data: existingData, error: updateError } = await supabase
        .from("cloud_sync")
        .update({
          data: data,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetWorkspaceId)
        .eq("store_key", storeKey)
        .select()

      if (updateError) throw updateError

      if (!existingData || existingData.length === 0) {
        const { error: insertError } = await supabase
          .from("cloud_sync")
          .insert({
            user_id: targetWorkspaceId,
            store_key: storeKey,
            data: data,
          })

        if (insertError) throw insertError
      }

      await set(localDirtyKey, false)
    } catch (error) {
      console.warn(`Cloud push failed for ${storeKey}, marking dirty:`, error)
      const wid = await getWorkspaceContext()
      const isGlobal = storeKey === "cleanbuild_projects_list"
      await set(isGlobal ? `dirty_${storeKey}` : `dirty_${storeKey}_${wid}`, true)
    }
  },

  async pullFromCloud(storeKey: string) {
    const wid = await getWorkspaceContext()
    const isGlobal = storeKey === "cleanbuild_projects_list"
    
    const localDirtyKey = isGlobal ? `dirty_${storeKey}` : `dirty_${storeKey}_${wid}`
    const localDataKey = isGlobal ? storeKey : `${storeKey}_${wid}`

    const legacyDirty = await get(`dirty_${storeKey}`)
    
    // 🔥 FIX: Prevent legacy dirty flags from cross-contaminating new blank projects
    if (legacyDirty && !isGlobal && wid && !wid.startsWith("proj_")) {
       await set(localDirtyKey, true)
       await set(`dirty_${storeKey}`, false)
    }

    const isDirty = await get(localDirtyKey)
    if (isDirty) {
      const localData = await get(localDataKey)
      if (localData !== undefined) {
        await this.pushToCloud(storeKey, localData)
      }
      return localData
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) return null

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user?.id) return null

    const targetWorkspaceId = isGlobal 
      ? userData.user.id 
      : (typeof window !== 'undefined' ? (localStorage.getItem("cleanbuild_active_workspace") || userData.user.id) : userData.user.id)

    const { data, error } = await supabase
      .from("cloud_sync")
      .select("data")
      .eq("user_id", targetWorkspaceId)
      .eq("store_key", storeKey)
      .maybeSingle()

    if (error || !data) return null

    await set(localDataKey, data.data)
    return data.data
  },

  async flushAllDirty() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return

    const wid = await getWorkspaceContext()

    for (const key of ALL_STORE_KEYS) {
      const isGlobal = key === "cleanbuild_projects_list"
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