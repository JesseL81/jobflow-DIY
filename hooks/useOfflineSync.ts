"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import { supabase } from "@/lib/supabase"

function getBlankSlate<T>(key: string, fallback: T): T {
  if (
    key === "cleanbuild_shared_rooms" || 
    key === "cleanbuild_selections_categories_list" || 
    key === "cleanbuild_vision_board_categories" ||
    key === "cleanbuild_projects_list"
  ) {
    return fallback
  }

  if (key === "cleanbuild_project_dates") {
    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setDate(today.getDate() + 30)
    
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      return `${yyyy}-${mm}-${dd}`
    }
    
    return { startDate: formatDate(today), endDate: formatDate(nextMonth) } as unknown as T
  }
  
  if (Array.isArray(fallback)) return [] as unknown as T
  if (typeof fallback === "number") return 0 as unknown as T
  if (typeof fallback === "object" && fallback !== null) return {} as unknown as T
  return fallback
}

export function useOfflineSync<T>(storeKey: string, fallbackData: T) {
  const [data, setData] = useState<T>(fallbackData)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const currentDataRef = useRef<T>(fallbackData)
  const localKeyRef = useRef<string>(storeKey)

  useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        let wid = typeof window !== 'undefined' ? localStorage.getItem("cleanbuild_active_workspace") : null
        if (!wid) {
           const { data: authData } = await supabase.auth.getUser()
           wid = authData?.user?.id || null
           if (wid && typeof window !== 'undefined') {
              localStorage.setItem("cleanbuild_active_workspace", wid)
           }
        }
        
        const isGlobal = storeKey === "cleanbuild_projects_list"
        const localKey = (wid && !isGlobal) ? `${storeKey}_${wid}` : storeKey
        localKeyRef.current = localKey

        let localData = await get<T>(localKey)
        
        const isSecondaryProject = wid && wid.startsWith("proj_")
        
        if (localData === undefined && localKey !== storeKey && !isSecondaryProject) {
          const legacyData = await get<T>(storeKey)
          if (legacyData !== undefined) {
            localData = legacyData
            await set(localKey, legacyData) 
          }
        }
        
        const targetFallback = isSecondaryProject ? getBlankSlate(storeKey, fallbackData) : fallbackData

        if (isMounted) {
          if (localData !== undefined) {
            setData(localData)
            currentDataRef.current = localData
          } else {
            setData(targetFallback)
            currentDataRef.current = targetFallback
          }
          setIsLoaded(true)
        }

        const cloudData = await syncManager.pullFromCloud(storeKey)
        if (isMounted && cloudData !== null && cloudData !== undefined) {
          setData(cloudData as T)
          currentDataRef.current = cloudData as T
        }
      } catch (err) {
        console.error(`Error loading store ${storeKey}:`, err)
        if (isMounted) {
          setData(fallbackData)
          currentDataRef.current = fallbackData
          setIsLoaded(true)
        }
      }
    }

    initialize()

    const handleWorkspaceChange = () => {
      if (isMounted) {
        if (storeKey !== "cleanbuild_projects_list") {
          setIsLoaded(false)
          
          const newWid = localStorage.getItem("cleanbuild_active_workspace")
          const isSecondary = newWid && newWid.startsWith("proj_")
          const targetFallback = isSecondary ? getBlankSlate(storeKey, fallbackData) : fallbackData
          
          setData(targetFallback)
          currentDataRef.current = targetFallback
          
          initialize() 
        }
      }
    }
    
    // 🔥 Force a silent cloud pull when the app comes back to the foreground on mobile
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isMounted) {
         const cloudData = await syncManager.pullFromCloud(storeKey)
         if (isMounted && cloudData !== null && cloudData !== undefined) {
           setData(cloudData as T)
           currentDataRef.current = cloudData as T
         }
      }
    }
    
    if (typeof window !== "undefined") {
      window.addEventListener("workspace-changed", handleWorkspaceChange)
      document.addEventListener("visibilitychange", handleVisibilityChange)
    }

    return () => {
      isMounted = false
      if (typeof window !== "undefined") {
        window.removeEventListener("workspace-changed", handleWorkspaceChange)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [storeKey]) 

  const saveAndSync = useCallback(
    async (updater: T | ((prev: T) => T)) => {
      const nextData = typeof updater === "function" 
        ? (updater as (prev: T) => T)(currentDataRef.current) 
        : updater

      currentDataRef.current = nextData
      setData(nextData)

      try {
        await set(localKeyRef.current, nextData)
        await syncManager.pushToCloud(storeKey, nextData)
      } catch (e) {
        console.error(`Failed to sync ${storeKey}:`, e)
      }
    },
    [storeKey]
  )

  return [data, saveAndSync, isLoaded] as const
}