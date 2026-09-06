"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"

export function useOfflineSync<T>(storeKey: string, fallbackData: T) {
  const [data, setData] = useState<T>(fallbackData)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // NEW: Keep a live, instant reference of the data to safely evaluate callbacks outside of setState
  const currentDataRef = useRef<T>(fallbackData)

  // 1. Initial Load (Offline IndexedDB first, then Cloud pull)
  useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        const localData = await get<T>(storeKey)
        
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

        // Silent background pull from Supabase
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

    return () => {
      isMounted = false
    }
  }, [storeKey]) // Intentionally omitting fallbackData to prevent infinite loops

  // 2. Universal Save function: Updates UI, IndexedDB, and Cloud instantly
  const saveAndSync = useCallback(
    async (updater: T | ((prev: T) => T)) => {
      // FIX: Safely evaluate the new state using the ref, completely outside of React's render loop
      const nextData = typeof updater === "function" 
        ? (updater as (prev: T) => T)(currentDataRef.current) 
        : updater

      // 1. Update the local ref immediately to support consecutive, back-to-back state calls
      currentDataRef.current = nextData
      
      // 2. Update the React UI state
      setData(nextData)

      // 3. Perform database side-effects safely outside the state setter
      try {
        await set(storeKey, nextData)
        await syncManager.pushToCloud(storeKey, nextData)
      } catch (e) {
        console.error(`Failed to sync ${storeKey}:`, e)
      }
    },
    [storeKey]
  )

  return [data, saveAndSync, isLoaded] as const
}