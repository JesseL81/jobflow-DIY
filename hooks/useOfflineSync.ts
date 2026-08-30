"use client"

import { useState, useEffect, useCallback } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"

export function useOfflineSync<T>(storeKey: string, fallbackData: T) {
  const [data, setData] = useState<T>(fallbackData)
  const [isLoaded, setIsLoaded] = useState(false)

  // 1. Initial Load (Offline IndexedDB first, then Cloud pull)
  useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        const localData = await get<T>(storeKey)
        
        if (isMounted) {
          if (localData !== undefined) {
            setData(localData)
          } else {
            setData(fallbackData)
          }
          setIsLoaded(true)
        }

        // Silent background pull from Supabase
        const cloudData = await syncManager.pullFromCloud(storeKey)
        if (isMounted && cloudData !== null && cloudData !== undefined) {
          setData(cloudData as T)
        }
      } catch (err) {
        console.error(`Error loading store ${storeKey}:`, err)
        if (isMounted) {
          setData(fallbackData)
          setIsLoaded(true)
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [storeKey])

  // 2. Universal Save function: Updates UI, IndexedDB, and Cloud instantly
  const saveAndSync = useCallback(
    async (updater: T | ((prev: T) => T)) => {
      setData((prev) => {
        const nextData = typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater

        // Save to offline storage immediately
        set(storeKey, nextData).catch((e) =>
          console.error(`Failed to save ${storeKey} to IndexedDB:`, e)
        )

        // Queue or push to cloud
        syncManager.pushToCloud(storeKey, nextData)

        return nextData
      })
    },
    [storeKey]
  )

  return [data, saveAndSync, isLoaded] as const
}