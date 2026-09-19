"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import { supabase } from "@/lib/supabase"

export function useOfflineSync<T>(storeKey: string, fallbackData: T) {
  const [data, setData] = useState<T>(fallbackData)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const currentDataRef = useRef<T>(fallbackData)
  // Track the dynamically namespaced key
  const localKeyRef = useRef<string>(storeKey)

  useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        // 1. Resolve Active Workspace ID dynamically
        let wid = typeof window !== 'undefined' ? localStorage.getItem("cleanbuild_active_workspace") : null
        if (!wid) {
           const { data: authData } = await supabase.auth.getUser()
           wid = authData?.user?.id || null
           if (wid && typeof window !== 'undefined') {
              localStorage.setItem("cleanbuild_active_workspace", wid)
           }
        }
        
        // 2. Dynamically namespace the local IndexedDB key
        const localKey = wid ? `${storeKey}_${wid}` : storeKey
        localKeyRef.current = localKey

        let localData = await get<T>(localKey)
        
        // 3. ZERO DATA LOSS MIGRATION: If namespaced key is empty, pull from legacy key
        if (localData === undefined && localKey !== storeKey) {
          const legacyData = await get<T>(storeKey)
          if (legacyData !== undefined) {
            localData = legacyData
            await set(localKey, legacyData) // Migrate it to the isolated project key safely
          }
        }
        
        if (isMounted) {
          if (localData !== undefined) {
            setData(localData)
            currentDataRef.current = localData
          } else {
            setData(fallbackData)
            currentDataRef.current = fallbackData
          }
          setIsLoaded(true)
        }

        // 4. Silent background pull from Supabase Cloud
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

    // 5. Real-Time Cross-Project Listener
    // When the Dashboard Dropdown fires this event, the hook instantly pivots to the new project DB
    const handleWorkspaceChange = () => {
      if (isMounted) {
        setIsLoaded(false)
        initialize() 
      }
    }
    
    if (typeof window !== "undefined") {
      window.addEventListener("workspace-changed", handleWorkspaceChange)
    }

    return () => {
      isMounted = false
      if (typeof window !== "undefined") {
        window.removeEventListener("workspace-changed", handleWorkspaceChange)
      }
    }
  }, [storeKey]) // Intentionally omitting fallbackData to prevent infinite loops

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