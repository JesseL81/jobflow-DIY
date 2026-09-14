import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
  }

  const domain = new URL(url).hostname.replace('www.', '')

  // 🔥 Aggressive Junk Filter
  const junkPhrases = [
    "Access Denied", "Error Page", "Pardon Our Interruption", 
    "Robot Check", "Security Check", "Just a moment...", "Bot Activity"
  ]
  
  const isJunk = (title: string, imageStr: string) => {
    const t = title || ""
    const i = imageStr || ""
    
    // 1. Check for firewall text in title
    if (junkPhrases.some(phrase => t.toLowerCase().includes(phrase.toLowerCase()))) return true
    
    // 2. Lowe's Specific: Akamai returns an ID number as the title and an Akamai logo
    if (/^\d+$/.test(t.trim())) return true
    if (i.toLowerCase().includes('akamai')) return true

    return false
  }

  // ==========================================
  // STRATEGY 1: Dub.co Free OpenGraph API
  // ==========================================
  try {
    const dubRes = await fetch(`https://api.dub.co/metatags?url=${encodeURIComponent(url)}`)
    if (dubRes.ok) {
      const json = await dubRes.json()
      if (json.title && !isJunk(json.title, json.image)) {
        return NextResponse.json({ 
          title: json.title, 
          description: json.description || '', 
          image: json.image || '', 
          domain 
        })
      }
    }
  } catch (e) {
    console.log("Strategy 1 Failed")
  }

  // ==========================================
  // STRATEGY 2: Microlink Free API
  // ==========================================
  try {
    const microRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
    if (microRes.ok) {
      const json = await microRes.json()
      const title = json.data?.title
      const img = json.data?.image?.url || json.data?.logo?.url || ''
      
      if (title && !isJunk(title, img)) {
        return NextResponse.json({
          title: title,
          description: json.data?.description || '',
          image: img,
          domain: json.data?.publisher || domain
        })
      }
    }
  } catch (e) {
    console.log("Strategy 2 Failed")
  }

  // ==========================================
  // STRATEGY 3: Direct Fetch (Social Bot Disguise)
  // ==========================================
  try {
    const directRes = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })

    if (directRes.ok) {
      const html = await directRes.text()
      
      // Lightweight Regex HTML parser
      const getMeta = (prop: string) => {
        const match = html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) ||
                      html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["'][^>]*>`, 'i')) ||
                      html.match(new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'))
        return match ? match[1] : null
      }

      let title = getMeta('og:title') || getMeta('twitter:title') || ''
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) title = titleMatch[1]
      }

      const img = getMeta('og:image') || getMeta('twitter:image') || ''

      if (title && !isJunk(title, img)) {
        return NextResponse.json({
          title: title.trim(),
          description: (getMeta('og:description') || '').trim(),
          image: img,
          domain
        })
      }
    }
  } catch (e) {
    console.log("Strategy 3 Failed")
  }

  // ==========================================
  // FALLBACK: All 3 Strategies Blocked
  // ==========================================
  // If we reach here, the retailer's firewall successfully blocked all attempts.
  // We throw a 403 error to trigger your shiny new Manual Fallback UI on the frontend.
  return NextResponse.json({ error: 'Blocked by retailer firewall on all endpoints' }, { status: 403 })
}